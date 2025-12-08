/**
 * Better Auth 服务端配置
 * https://www.better-auth.com/docs/plugins/username
 */

import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

// MongoDB 连接
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://root:Super123456@localhost:27017/demo?replicaSet=rs0&authSource=admin";

const client = new MongoClient(MONGO_URI);

// 连接数据库
client.connect().then(() => {
  console.log("✅ MongoDB 连接成功");
}).catch((err) => {
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

  // 添加 username 插件
  plugins: [
    username(),
  ],
});
