/**
 * tRPC 初始化和基础配置
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "./auth";

// 从 Better Auth 获取 Session 类型
type Session = typeof auth.$Infer.Session;

/**
 * Context 类型定义
 */
export interface Context {
  req?: Request;
  session: Session | null;
}

/**
 * 创建 Context - 从 Better Auth 获取 session
 */
export const createContext = async (req?: Request): Promise<Context> => {
  let session: Session | null = null;

  if (req) {
    const result = await auth.api.getSession({ headers: req.headers });
    session = result;
  }

  return { req, session };
};

/**
 * 初始化 tRPC
 */
const t = initTRPC.context<Context>().create();

/**
 * 认证中间件
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * 导出可复用的 router 和 procedure
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const middleware = t.middleware;
