/**
 * 企业成员相关的 tRPC router
 */

import { router, protectedProcedure } from "../trpc";
import { syncCorpUsers, getCorpUsers } from "../service/corpUser";

export const corpUserRouter = router({
  // 获取企业成员列表
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await getCorpUsers(userId);
  }),

  // 全量同步企业成员
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await syncCorpUsers(userId);
  }),
});