/**
 * 主 Router - 聚合所有子路由
 */

import { router } from "../trpc";
import { userRouter } from "./user";
import { profileRouter } from "./profile";
import { notificationRouter } from "./notification";
import { settingRouter } from "./setting";
import { corpUserRouter } from "./corpUser";

/**
 * App Router - 所有 API 路由的根
 * 注：认证由 Better Auth 在 /api/auth/* 处理
 */
export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  notification: notificationRouter,
  setting: settingRouter,
  corpUser: corpUserRouter,
});

/**
 * 导出 router 类型供客户端使用
 */
export type AppRouter = typeof appRouter;
