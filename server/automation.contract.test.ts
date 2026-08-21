import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname);
const newJobRefresh = readFileSync(resolve(root, "newJobRefresh.ts"), "utf8");
const reminder = readFileSync(resolve(root, "scheduledInterviewReminder.ts"), "utf8");

describe("matching and reminder automation contracts", () => {
  it("grounds new-job alerts in the calculated threshold, preference, job identity, and a duplicate-safe fingerprint", () => {
    expect(newJobRefresh).toContain("DEFAULT_HIGH_MATCH_THRESHOLD");
    expect(newJobRefresh).toContain("profile.highMatchNotificationsEnabled");
    expect(newJobRefresh).toContain("jobId: job.id");
    expect(newJobRefresh).toContain("fingerprint: `high-match:${job.id}`");
  });

  it("requires Job Sarthi machine authentication, processes only bounded due work, and records a deduplicated in-app result", () => {
    expect(reminder).toContain("requireSchedulerAuth(req, res)");
    expect(reminder).toContain("listDueInterviewReminders(50)");
    expect(reminder).toContain("fingerprint: `interview-reminder:${reminder.id}`");
    expect(reminder).toContain("markInterviewReminderSent(reminder.id)");
  });
});
