/**
 * 主 Router - 聚合所有子路由
 */

import { router } from "../trpc";
import { userRouter } from "./user";

/**
 * App Router - 所有 API 路由的根
 * 注：认证由 Better Auth 在 /api/auth/* 处理
 */
export const appRouter = router({
  user: userRouter,
});

/**
 * 导出 router 类型供客户端使用
 */
export type AppRouter = typeof appRouter;
