/**
 * 客户相关的 tRPC router
 */

import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { getCustomers, syncCustomerListByWxUserId } from "../service/customer";
import {
  createSyncTask,
  startSyncTask,
  retryTaskItem,
  getTaskDetail,
  getTaskList,
  getTaskProgress,
} from "../service/syncCustomerTask";

export const customerRouter = router({
  // 获取客户列表（支持分页）
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await getCustomers(userId, input.page, input.pageSize);
    }),

  // 同步指定接粉号的客户列表（单个接粉号同步）
  syncByWxUserId: protectedProcedure
    .input((val: unknown) => {
      if (typeof val === "string") return val;
      throw new Error("Invalid input: expected string");
    })
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await syncCustomerListByWxUserId(userId, input);
    }),

  // 创建同步任务
  createTask: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await createSyncTask(userId);
  }),

  // 开始执行任务
  startTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await startSyncTask(input.taskId);
    }),

  // 重试单个任务项
  retryItem: protectedProcedure
    .input(
      z.object({
        taskItemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await retryTaskItem(input.taskItemId);
    }),

  // 获取任务详情
  getTaskDetail: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getTaskDetail(input.taskId);
    }),

  // 获取任务列表
  getTaskList: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await getTaskList(userId);
  }),

  // 获取单个任务的实时进度
  getTaskProgress: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getTaskProgress(input.taskId);
    }),
});