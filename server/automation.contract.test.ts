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

  it("requires a cron task UID, resolves reminder ownership by task UID, skips sent work, and records a deduplicated in-app result", () => {
    expect(reminder).toContain("!actor.isCron || !actor.taskUid");
    expect(reminder).toContain("getInterviewReminderByTaskUid(actor.taskUid)");
    expect(reminder).toContain("reminder.status !== \"scheduled\"");
    expect(reminder).toContain("fingerprint: `interview-reminder:${reminder.id}`");
    expect(reminder).toContain("markInterviewReminderSent(reminder.id)");
  });
});
