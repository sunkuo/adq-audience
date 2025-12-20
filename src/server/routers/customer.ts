/**
 * 客户相关的 tRPC router（第一阶段）
 */

import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { syncAllCustomers, getCustomers, syncCustomerListByWxUserId } from "../service/customer";

export const customerRouter = router({
  // 获取客户列表（支持分页）
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log(`[customer-router] list called with page=${input.page}, pageSize=${input.pageSize}`);
      return await getCustomers(userId, input.page, input.pageSize);
    }),

  // 全量同步所有客户的external_userid
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await syncAllCustomers(userId);
  }),

  // 同步指定接粉号的客户列表
  syncByWxUserId: protectedProcedure
    .input((val: unknown) => {
      if (typeof val === "string") return val;
      throw new Error("Invalid input: expected string");
    })
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await syncCustomerListByWxUserId(userId, input);
    }),
});
