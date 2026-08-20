import type { Request, Response } from "express";
import { createApplicationTimelineEvent, createNotification, getApplicationForUser, getCandidateProfile, getInterviewReminderByTaskUid, markInterviewReminderSent } from "./db";
import { sdk } from "./_core/sdk";

export async function scheduledInterviewReminder(req: Request, res: Response) {
  try {
    const actor = await sdk.authenticateRequest(req);
    if (!actor.isCron || !actor.taskUid) return res.status(403).json({ error: "cron-only" });
    const reminder = await getInterviewReminderByTaskUid(actor.taskUid);
    if (!reminder || reminder.status !== "scheduled") return res.json({ ok: true, skipped: "orphan-or-not-scheduled" });
    if (reminder.remindAt.getTime() > Date.now()) return res.json({ ok: true, skipped: "not-due" });
    const [profile, application] = await Promise.all([getCandidateProfile(reminder.userId), getApplicationForUser(reminder.applicationId, reminder.userId)]);
    if (!application) return res.json({ ok: true, skipped: "orphan-application" });
    if (profile?.interviewRemindersEnabled) await createNotification({ userId: reminder.userId, type: "interview_reminder", title: `Interview reminder: ${application.job.title}`, body: `${reminder.title} with ${application.job.company} is scheduled for ${reminder.scheduledFor.toLocaleString()}.`, href: `/applications/${reminder.applicationId}`, applicationId: reminder.applicationId, jobId: application.job.id, fingerprint: `interview-reminder:${reminder.id}` });
    await markInterviewReminderSent(reminder.id);
    await createApplicationTimelineEvent(reminder.applicationId, reminder.userId, "reminder_sent", "Interview reminder processed.");
    return res.json({ ok: true, reminderId: reminder.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "interview reminder failed", timestamp: new Date().toISOString() });
  }
}
