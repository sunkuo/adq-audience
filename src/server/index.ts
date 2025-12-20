/**
 * Bun 服务器入口
 */

import { serve } from "bun";
import index from "../client/index.html";
import { handleTRPCRequest } from "./handler";
import { auth } from "./auth";
// 加载 BullMQ（导入时自动注册所有队列）
import { startBullBoard } from "./bullmq/index";
import fs from "fs";
import path from "path";

const server = serve({
  port: 4000,
  routes: {
    // Better Auth API - 处理所有 /api/auth/* 请求
    "/api/auth/*": (req) => auth.handler(req),

    // tRPC API
    "/api/trpc/*": handleTRPCRequest,

    // 下载导出文件
    "/api/download/*": async (req) => {
      const url = new URL(req.url);
      const filename = url.pathname.replace("/api/download/", "");

      if (!filename) {
        return new Response("File not found", { status: 404 });
      }

      const exportDir = path.join(process.cwd(), 'exports');
      const filePath = path.join(exportDir, decodeURIComponent(filename));

      // 安全检查：防止路径遍历攻击
      if (!filePath.startsWith(exportDir)) {
        return new Response("Invalid file path", { status: 403 });
      }

      try {
        if (!fs.existsSync(filePath)) {
          return new Response("File not found", { status: 404 });
        }

        console.log(`[download] filePath exists: ${fs.existsSync(filePath)}`);

        const fileBuffer = fs.readFileSync(filePath);

        return new Response(fileBuffer, {
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (error) {
        console.error("Download error:", error);
        return new Response("Download failed", { status: 500 });
      }
    },

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
