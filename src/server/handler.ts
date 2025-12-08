/**
 * tRPC HTTP 处理器
 * 用于将 tRPC 集成到 Bun.serve()
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";
import { createContext } from "./trpc";

/**
 * 处理 tRPC 请求的函数
 */
export const handleTRPCRequest = (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError({ error, path }) {
      console.error(`tRPC Error on '${path}':`, error);
    },
  });
};

