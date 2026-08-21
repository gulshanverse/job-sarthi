import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { cancelInterviewReminder, createApplicationNote, createApplicationTimelineEvent, deleteApplicationNote, getApplicationForUser, getInterviewReminderForApplication, listApplicationNotes, listApplicationTimeline, saveInterviewReminder, updateApplicationNote } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const applicationId = z.object({ applicationId: z.number().int().positive() });
const noteContent = z.string().trim().min(1, "Write a note before saving.").max(4_000, "Keep each note under 4,000 characters.");
const reminderInput = applicationId.extend({ scheduledFor: z.coerce.date(), leadMinutes: z.number().int().min(15).max(10_080), title: z.string().trim().min(2).max(180), notes: z.string().trim().max(2_000).nullable().default(null) });


async function owned(applicationIdValue: number, userId: number) {
  const item = await getApplicationForUser(applicationIdValue, userId);
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
  return item;
}

export const applicationsRouter = router({
  detail: protectedProcedure.input(applicationId).query(async ({ ctx, input }) => {
    const item = await owned(input.applicationId, ctx.user.id);
    const [notes, reminder, timeline] = await Promise.all([listApplicationNotes(input.applicationId, ctx.user.id), getInterviewReminderForApplication(input.applicationId, ctx.user.id), listApplicationTimeline(input.applicationId, ctx.user.id)]);
    return { ...item, notes, reminder, timeline };
  }),
  addNote: protectedProcedure.input(applicationId.extend({ content: noteContent })).mutation(async ({ ctx, input }) => {
    await owned(input.applicationId, ctx.user.id);
    const note = await createApplicationNote(input.applicationId, ctx.user.id, input.content);
    await createApplicationTimelineEvent(input.applicationId, ctx.user.id, "note_added", "Added a private application note.");
    return note;
  }),
  updateNote: protectedProcedure.input(applicationId.extend({ noteId: z.number().int().positive(), content: noteContent })).mutation(async ({ ctx, input }) => {
    await owned(input.applicationId, ctx.user.id);
    const note = await updateApplicationNote(input.noteId, input.applicationId, ctx.user.id, input.content);
    if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
    return note;
  }),
  deleteNote: protectedProcedure.input(applicationId.extend({ noteId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await owned(input.applicationId, ctx.user.id);
    await deleteApplicationNote(input.noteId, input.applicationId, ctx.user.id);
    return { success: true };
  }),
  saveReminder: protectedProcedure.input(reminderInput).mutation(async ({ ctx, input }) => {
    const item = await owned(input.applicationId, ctx.user.id);
    const remindAt = new Date(input.scheduledFor.getTime() - input.leadMinutes * 60_000);
    if (input.scheduledFor.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose a future interview time." });
    if (remindAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a reminder time that is still in the future." });
    const existing = await getInterviewReminderForApplication(input.applicationId, ctx.user.id);
    const reminder = await saveInterviewReminder(input.applicationId, ctx.user.id, { scheduledFor: input.scheduledFor, remindAt, title: input.title, notes: input.notes, scheduleCronTaskUid: existing?.scheduleCronTaskUid ?? null });
    if (!reminder) throw new Error("Could not save the interview reminder.");
    await createApplicationTimelineEvent(input.applicationId, ctx.user.id, "reminder_scheduled", `Interview reminder scheduled for ${input.leadMinutes >= 1440 ? "one day" : `${input.leadMinutes} minutes`} before the interview.`);
    return { reminder: await getInterviewReminderForApplication(input.applicationId, ctx.user.id), application: item };
  }),
  cancelReminder: protectedProcedure.input(applicationId).mutation(async ({ ctx, input }) => {
    await owned(input.applicationId, ctx.user.id);
    const reminder = await getInterviewReminderForApplication(input.applicationId, ctx.user.id);
    if (!reminder) throw new TRPCError({ code: "NOT_FOUND", message: "Reminder not found." });
    await cancelInterviewReminder(input.applicationId, ctx.user.id);
    await createApplicationTimelineEvent(input.applicationId, ctx.user.id, "reminder_cancelled", "Cancelled the interview reminder.");
    return { success: true };
  }),
});
