import { Hono } from "hono";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "hono/bun";
import { registeredQueues } from "./registry";

/**
 * 启动 Bull Board 监控面板
 * 自动收集所有通过 @Queue 和 @Schedule 注册的队列
 * @param port 端口号，默认 3001
 */
export function startBullBoard(port = 3001) {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/queues");

  createBullBoard({
    queues: registeredQueues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  const app = new Hono();
  app.route("/queues", serverAdapter.registerPlugin());

  Bun.serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🎯 Bull Board started on http://localhost:${port}/queues`);
}
