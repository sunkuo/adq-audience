/**
 * 通知相关的 tRPC router
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  deleteAllNotifications,
} from "../service/notification";

export const notificationRouter = router({
  // 获取通知列表
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          unreadOnly: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return getNotifications(userId, input);
    }),

  // 获取未读通知数量
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return getUnreadCount(userId);
  }),

  // 标记单个通知为已读
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const success = await markAsRead(userId, input.notificationId);
      return { success };
    }),

  // 标记所有通知为已读
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const count = await markAllAsRead(userId);
    return { count };
  }),

  // 删除单个通知
  delete: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const success = await deleteNotification(userId, input.notificationId);
      return { success };
    }),

  // 删除所有已读通知
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const count = await deleteAllReadNotifications(userId);
    return { count };
  }),

  // 删除所有通知
  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const count = await deleteAllNotifications(userId);
    return { count };
  }),
});
