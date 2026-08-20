import { z } from "zod";
import { dismissNotification, listNotifications, markNotificationRead } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
  markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await markNotificationRead(ctx.user.id, input.notificationId); return { success: true }; }),
  dismiss: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await dismissNotification(ctx.user.id, input.notificationId); return { success: true }; }),
});
