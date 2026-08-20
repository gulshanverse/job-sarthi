import { z } from "zod";
import { dismissNotification, getCandidateProfile, listNotifications, markAllNotificationsRead, markNotificationRead, updateNotificationPreferences } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
  markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await markNotificationRead(ctx.user.id, input.notificationId); return { success: true }; }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await markAllNotificationsRead(ctx.user.id); return { success: true }; }),
  dismiss: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await dismissNotification(ctx.user.id, input.notificationId); return { success: true }; }),
  preferences: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    return { highMatchNotificationsEnabled: profile?.highMatchNotificationsEnabled ?? true, applicationUpdatesEnabled: profile?.applicationUpdatesEnabled ?? true, interviewRemindersEnabled: profile?.interviewRemindersEnabled ?? true, skillInsightsEnabled: profile?.skillInsightsEnabled ?? true };
  }),
  updatePreferences: protectedProcedure.input(z.object({ highMatchNotificationsEnabled: z.boolean(), applicationUpdatesEnabled: z.boolean(), interviewRemindersEnabled: z.boolean(), skillInsightsEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const profile = await updateNotificationPreferences(ctx.user.id, input);
    if (!profile) throw new Error("Create your profile before updating notification preferences.");
    return profile;
  }),
});
