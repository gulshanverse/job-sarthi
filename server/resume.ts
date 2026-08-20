import * as mammoth from "mammoth";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";
import { normaliseSkills } from "./skills";

export type ResumeExtraction = {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  linkedInUrl: string;
  githubUrl: string;
  headline: string;
  desiredRoles: string[];
  skills: string[];
  experience: Array<{ title: string; company: string; duration: string; highlights: string[] }>;
  education: Array<{ institution: string; qualification: string; year: string; field: string; score: string }>;
  projects: Array<{ title: string; description: string; technologies: string[] }>;
  certifications: Array<{ name: string; issuer: string; year: string }>;
};

const extractionSchema = {
  name: "resume_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      fullName: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      currentLocation: { type: "string" },
      linkedInUrl: { type: "string" },
      githubUrl: { type: "string" },
      headline: { type: "string" },
      desiredRoles: { type: "array", items: { type: "string" } },
      skills: { type: "array", items: { type: "string" } },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            duration: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
          },
          required: ["title", "company", "duration", "highlights"],
          additionalProperties: false,
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            qualification: { type: "string" },
            year: { type: "string" },
            field: { type: "string" },
            score: { type: "string" },
          },
          required: ["institution", "qualification", "year", "field", "score"],
          additionalProperties: false,
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" }, technologies: { type: "array", items: { type: "string" } } },
          required: ["title", "description", "technologies"],
          additionalProperties: false,
        },
      },
      certifications: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, issuer: { type: "string" }, year: { type: "string" } },
          required: ["name", "issuer", "year"],
          additionalProperties: false,
        },
      },
    },
    required: ["fullName", "email", "phone", "currentLocation", "linkedInUrl", "githubUrl", "headline", "desiredRoles", "skills", "experience", "education", "projects", "certifications"],
    additionalProperties: false,
  },
} as const;

export async function extractResumeProfile(input: {
  buffer: Buffer;
  mimeType: string;
  storageKey: string;
}): Promise<ResumeExtraction> {
  const basePrompt = "Extract only information explicitly present in this resume. Do not infer, complete, or invent missing details. Return empty strings or arrays for absent fields. Keep personal contact data only when explicitly written. Return concise skills; final normalization is performed by the application.";
  if (input.mimeType === "application/pdf" && !input.buffer.subarray(0, 5).toString("utf8").startsWith("%PDF-")) throw new Error("This PDF is unreadable or corrupted.");
  if (input.mimeType.includes("wordprocessingml") && input.buffer.subarray(0, 2).toString("utf8") !== "PK") throw new Error("This DOCX file is unreadable or corrupted.");
  const docxText = input.mimeType.includes("wordprocessingml") ? (await mammoth.extractRawText({ buffer: input.buffer })).value.trim() : "";
  if (input.mimeType.includes("wordprocessingml") && !docxText) throw new Error("This DOCX file does not contain readable text.");
  const content = input.mimeType === "application/pdf"
    ? [
        { type: "text" as const, text: basePrompt },
        { type: "file_url" as const, file_url: { url: await storageGetSignedUrl(input.storageKey), mime_type: "application/pdf" as const } },
      ]
    : [
        {
          type: "text" as const,
          text: `${basePrompt}\n\nResume text:\n${docxText.slice(0, 30000)}`,
        },
      ];
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You are a careful resume parser. Never add information that is not present in the supplied resume." },
      { role: "user", content },
    ],
    response_format: { type: "json_schema", json_schema: extractionSchema },
    maxTokens: 3000,
  });
  const resultText = response.choices[0]?.message.content;
  if (typeof resultText !== "string") throw new Error("The resume parser did not return JSON text");
  const extraction = JSON.parse(resultText) as ResumeExtraction;
  return {
    ...extraction,
    skills: normaliseSkills(extraction.skills),
    projects: extraction.projects.map(project => ({ ...project, technologies: normaliseSkills(project.technologies) })),
  };
}
