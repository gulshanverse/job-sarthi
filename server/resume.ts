import * as mammoth from "mammoth";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";

export type ResumeExtraction = {
  headline: string;
  desiredRoles: string[];
  skills: string[];
  experience: Array<{ title: string; company: string; duration: string; highlights: string[] }>;
  education: Array<{ institution: string; qualification: string; year: string }>;
};

const extractionSchema = {
  name: "resume_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
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
          },
          required: ["institution", "qualification", "year"],
          additionalProperties: false,
        },
      },
    },
    required: ["headline", "desiredRoles", "skills", "experience", "education"],
    additionalProperties: false,
  },
} as const;

export async function extractResumeProfile(input: {
  buffer: Buffer;
  mimeType: string;
  storageKey: string;
}): Promise<ResumeExtraction> {
  const basePrompt = "Extract only information explicitly present in this resume. Do not infer or invent missing details. Return concise, normalised skills and roles. Use empty strings or arrays when the resume does not contain a field.";
  const content = input.mimeType === "application/pdf"
    ? [
        { type: "text" as const, text: basePrompt },
        { type: "file_url" as const, file_url: { url: await storageGetSignedUrl(input.storageKey), mime_type: "application/pdf" as const } },
      ]
    : [
        {
          type: "text" as const,
          text: `${basePrompt}\n\nResume text:\n${(await mammoth.extractRawText({ buffer: input.buffer })).value.slice(0, 30000)}`,
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
  return JSON.parse(resultText);
}
