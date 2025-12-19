/**
 * Bun 服务器入口
 */

import { serve } from "bun";
import index from "../client/index.html";
import { handleTRPCRequest } from "./handler";
import { auth } from "./auth";
// 加载 BullMQ（导入时自动注册所有队列）
import { startBullBoard } from "./bullmq/index";

const server = serve({
  port: 4000,
  routes: {
    // Better Auth API - 处理所有 /api/auth/* 请求
    "/api/auth/*": (req) => auth.handler(req),

    // tRPC API
    "/api/trpc/*": handleTRPCRequest,

    // SPA fallback
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

// 启动 Bull Board
startBullBoard();

console.log(`🚀 Server running at ${server.url}`);
