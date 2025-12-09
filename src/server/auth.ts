/**
 * Better Auth 服务端配置
 * https://www.better-auth.com/docs/plugins/username
 * https://www.better-auth.com/docs/plugins/admin
 */

import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { config } from "./config";

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
});