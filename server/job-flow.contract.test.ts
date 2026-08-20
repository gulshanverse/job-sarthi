import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("candidate job-flow contracts", () => {
  it("synchronizes shared job-card save state across browse, saved, recommendation, and detail views", () => {
    const card = source("../client/src/components/JobCard.tsx");
    expect(card).toContain("utils.jobs.list.invalidate()");
    expect(card).toContain("utils.jobs.saved.invalidate()");
    expect(card).toContain("utils.recommendations.list.invalidate()");
    expect(card).toContain("utils.jobs.get.invalidate({ jobId: job.id })");
  });

  it("keeps application submission truthful by requiring an external open before an applied status can be selected", () => {
    const detail = source("../client/src/pages/JobDetail.tsx");
    expect(detail).toContain('window.open(item.applicationUrl, "_blank", "noopener,noreferrer")');
    expect(detail).toContain("setExternalOpened(true)");
    expect(detail).toContain("externalOpened &&");
    expect(detail).toContain('status: "applied"');
    expect(detail).toContain("never assumes you submitted an application");
  });
});
