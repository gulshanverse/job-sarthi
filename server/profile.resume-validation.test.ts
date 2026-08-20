import { describe, expect, it } from "vitest";
import { validateResumeFile } from "./routers/profile";

describe("resume upload validation", () => {
  it("accepts files only when their MIME type, extension, and signature agree", () => {
    expect(() => validateResumeFile("candidate.pdf", "application/pdf", Buffer.from("%PDF-1.7\nresume"))).not.toThrow();
    expect(() => validateResumeFile("candidate.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("PK\u0003\u0004"))).not.toThrow();
    expect(() => validateResumeFile("candidate.pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("PK\u0003\u0004"))).toThrow(/file type matches its extension/i);
    expect(() => validateResumeFile("candidate.pdf", "application/pdf", Buffer.from("not-a-pdf"))).toThrow(/unreadable or corrupted/i);
  });

  it("rejects empty and oversized resume uploads before storage or extraction", () => {
    expect(() => validateResumeFile("candidate.pdf", "application/pdf", Buffer.alloc(0))).toThrow(/empty/i);
    expect(() => validateResumeFile("candidate.pdf", "application/pdf", Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(5 * 1024 * 1024)]))).toThrow(/5 MB or smaller/i);
  });
});
