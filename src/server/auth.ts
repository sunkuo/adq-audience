/**
 * Better Auth 服务端配置
 * https://www.better-auth.com/docs/plugins/username
 * https://www.better-auth.com/docs/plugins/admin
 */

import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { username, admin } from "better-auth/plugins";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { config } from "./config";
import Profile from "./entity/profile";

// MongoDB 连接
const client = new MongoClient(config.mongoUri);

// 连接数据库
client
  .connect()
  .then(() => {
    console.log("✅ MongoDB 连接成功");
  })
  .catch((err) => {
    console.error("❌ MongoDB 连接失败:", err);
  });

const db = client.db();

/**
 * Better Auth 实例
 */
export const auth = betterAuth({
  database: mongodbAdapter(db),

  // 启用邮箱密码认证
  emailAndPassword: {
    enabled: true,
  },

  // 添加插件
  plugins: [
    username(),
    admin({
      defaultRole: "user", // 默认用户角色
      adminRoles: ["admin"], // 管理员角色
    }),
  ],

  // 钩子：用户注册后创建 Profile
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // 检测注册请求
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            // 创建用户的 Profile
            await Profile.create({
              userid: newSession.user.id,
              nickname: newSession.user.name || "",
              avatar: "",
            });
            console.log(`✅ Profile created for user: ${newSession.user.id}`);
          } catch (err) {
            console.error("❌ Failed to create profile:", err);
          }
        }
      }
    }),
  },
});