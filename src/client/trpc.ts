/**
 * tRPC 客户端配置
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/routers";

const TOKEN_KEY = "auth_token";

/**
 * 获取存储的 token
 */
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

/**
 * tRPC 客户端实例
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
