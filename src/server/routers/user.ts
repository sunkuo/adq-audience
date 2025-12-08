/**
 * 用户相关的 tRPC router
 * 示例：展示 query 和 mutation 的使用
 */

import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// 模拟用户数据库
const users: { id: string; name: string; email: string }[] = [
  { id: "1", name: "张三", email: "zhangsan@example.com" },
  { id: "2", name: "李四", email: "lisi@example.com" },
];

export const userRouter = router({
  // 获取所有用户
  list: publicProcedure.query(() => {
    return users;
  }),

  // 根据 ID 获取用户
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const user = users.find((u) => u.id === input.id);
      if (!user) {
        throw new Error(`User with id ${input.id} not found`);
      }
      return user;
    }),

  // 创建用户
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "名字不能为空"),
        email: z.string().email("请输入有效的邮箱"),
      })
    )
    .mutation(({ input }) => {
        console.log("create", input);
      const newUser = {
        id: String(users.length + 1),
        name: input.name,
        email: input.email,
      };
      users.push(newUser);
      return newUser;
    }),

  // 删除用户
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const index = users.findIndex((u) => u.id === input.id);
      if (index === -1) {
        throw new Error(`User with id ${input.id} not found`);
      }
      const [deleted] = users.splice(index, 1);
      return deleted;
    }),
});

