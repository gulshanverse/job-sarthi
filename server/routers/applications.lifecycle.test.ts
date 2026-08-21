import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const dbMocks = vi.hoisted(() => ({ cancelInterviewReminder: vi.fn(), createApplicationNote: vi.fn(), createApplicationTimelineEvent: vi.fn(), deleteApplicationNote: vi.fn(), getApplicationForUser: vi.fn(), getInterviewReminderForApplication: vi.fn(), listApplicationNotes: vi.fn(), listApplicationTimeline: vi.fn(), saveInterviewReminder: vi.fn(), updateApplicationNote: vi.fn() }));
vi.mock("../db", () => dbMocks);
import { applicationsRouter } from "./applications";

const user = { id: 11, openId: "preserved-candidate", name: "Candidate", email: "candidate@example.com", passwordHash: "hash", authStatus: "active" as const, emailVerified: false, termsAcceptedAt: null, passwordChangedAt: new Date(), loginMethod: "password", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user, sessionId: 3, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("private application notes and reminders", () => {
  beforeEach(() => { vi.clearAllMocks(); dbMocks.getApplicationForUser.mockResolvedValue({ application: { id: 21 }, job: { id: 88, title: "Role" } }); });

  it("creates a private note and timeline event only for the authenticated application owner", async () => {
    dbMocks.createApplicationNote.mockResolvedValue({ id: 4, content: "Follow up next week" });
    await expect(applicationsRouter.createCaller(context).addNote({ applicationId: 21, content: "Follow up next week" })).resolves.toMatchObject({ id: 4 });
    expect(dbMocks.getApplicationForUser).toHaveBeenCalledWith(21, user.id);
    expect(dbMocks.createApplicationNote).toHaveBeenCalledWith(21, user.id, "Follow up next week");
    expect(dbMocks.createApplicationTimelineEvent).toHaveBeenCalledWith(21, user.id, "note_added", expect.any(String));
  });

  it("saves a future reminder against the authenticated owner and rejects a non-owned application", async () => {
    const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);
    dbMocks.getInterviewReminderForApplication.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 6, scheduledFor });
    dbMocks.saveInterviewReminder.mockResolvedValue({ id: 6 });
    await expect(applicationsRouter.createCaller(context).saveReminder({ applicationId: 21, scheduledFor, leadMinutes: 30, title: "Interview", notes: null })).resolves.toMatchObject({ reminder: { id: 6 } });
    expect(dbMocks.saveInterviewReminder).toHaveBeenCalledWith(21, user.id, expect.objectContaining({ title: "Interview", remindAt: expect.any(Date) }));
    dbMocks.getApplicationForUser.mockResolvedValueOnce(null);
    await expect(applicationsRouter.createCaller(context).addNote({ applicationId: 999, content: "Private" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.createApplicationNote).toHaveBeenCalledTimes(0);
  });
});
