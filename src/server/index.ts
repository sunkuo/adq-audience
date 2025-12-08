/**
 * Bun 服务器入口
 */

import { serve } from "bun";
import index from "../client/index.html";
import { handleTRPCRequest } from "./handler";
import { auth } from "./auth";

const server = serve({
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

console.log(`🚀 Server running at ${server.url}`);
