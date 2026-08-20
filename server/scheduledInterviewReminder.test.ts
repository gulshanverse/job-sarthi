import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ reminder: { id: 17, userId: 4, applicationId: 8, status: "scheduled", remindAt: new Date(Date.now() - 60_000), scheduledFor: new Date(Date.now() + 3_600_000), title: "Interview reminder" } as any, notify: vi.fn(), markSent: vi.fn(), event: vi.fn() }));
vi.mock("./db", () => ({
  getInterviewReminderByTaskUid: vi.fn(async () => runtime.reminder),
  getCandidateProfile: vi.fn(async () => ({ interviewRemindersEnabled: true })),
  getApplicationForUser: vi.fn(async () => ({ application: { id: 8 }, job: { id: 12, title: "Frontend Engineer", company: "Northstar" } })),
  createNotification: runtime.notify,
  markInterviewReminderSent: runtime.markSent.mockImplementation(async () => { runtime.reminder.status = "sent"; }),
  createApplicationTimelineEvent: runtime.event,
}));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn(async () => ({ isCron: true, taskUid: "task-17" })) } }));
import { scheduledInterviewReminder } from "./scheduledInterviewReminder";

function response() { const result = { status: vi.fn(), json: vi.fn() }; result.status.mockReturnValue(result); return result; }
beforeEach(() => { runtime.reminder.status = "scheduled"; runtime.reminder.remindAt = new Date(Date.now() - 60_000); runtime.notify.mockReset(); runtime.markSent.mockClear(); runtime.event.mockClear(); });
describe("scheduled interview reminder", () => {
  it("delivers one in-app reminder only to a cron-authenticated due schedule and skips a repeated sent invocation", async () => {
    const first = response(); await scheduledInterviewReminder({} as any, first as any);
    expect(runtime.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 4, applicationId: 8, jobId: 12, fingerprint: "interview-reminder:17" })); expect(runtime.markSent).toHaveBeenCalledWith(17); expect(first.json).toHaveBeenCalledWith({ ok: true, reminderId: 17 });
    const second = response(); await scheduledInterviewReminder({} as any, second as any); expect(runtime.notify).toHaveBeenCalledTimes(1); expect(second.json).toHaveBeenCalledWith({ ok: true, skipped: "orphan-or-not-scheduled" });
  });
});
