/**
 * Better Auth 客户端配置
 * https://www.better-auth.com/docs/concepts/client
 */

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/**
 * Auth 客户端实例
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  plugins: [
    usernameClient(),
  ],
});

// 导出常用方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;

