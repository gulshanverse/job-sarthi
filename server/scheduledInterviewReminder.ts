import type { Request, Response } from "express";
import { createApplicationTimelineEvent, createNotification, getApplicationForUser, getCandidateProfile, listDueInterviewReminders, markInterviewReminderSent } from "./db";
import { sdk } from "./_core/sdk";

export async function scheduledInterviewReminder(req: Request, res: Response) {
  try {
    const actor = await sdk.authenticateRequest(req);
    if (!actor.isCron) return res.status(403).json({ error: "cron-only" });
    const reminders = await listDueInterviewReminders(50);
    let processed = 0;
    for (const reminder of reminders) {
      const [profile, application] = await Promise.all([getCandidateProfile(reminder.userId), getApplicationForUser(reminder.applicationId, reminder.userId)]);
      if (!application) continue;
      if (profile?.interviewRemindersEnabled) await createNotification({ userId: reminder.userId, type: "interview_reminder", title: `Interview reminder: ${application.job.title}`, body: `${reminder.title} with ${application.job.company} is scheduled for ${reminder.scheduledFor.toLocaleString()}.`, href: `/applications/${reminder.applicationId}`, applicationId: reminder.applicationId, jobId: application.job.id, fingerprint: `interview-reminder:${reminder.id}` });
      await markInterviewReminderSent(reminder.id);
      await createApplicationTimelineEvent(reminder.applicationId, reminder.userId, "reminder_sent", "Interview reminder processed.");
      processed += 1;
    }
    return res.json({ ok: true, processed });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "interview reminder failed", timestamp: new Date().toISOString() });
  }
}
