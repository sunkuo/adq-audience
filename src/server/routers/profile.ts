/**
 * 个人资料相关的 tRPC router
 * 使用 mongoose Profile 实体管理用户资料
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import Profile from "../entity/profile";

export const profileRouter = router({
  // 获取当前用户的个人资料
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // 查找用户资料，如果不存在则返回默认值
    let profile = await Profile.findOne({ userid: userId });
    
    if (!profile) {
      // 如果没有资料，返回默认数据
      return {
        nickname: ctx.session.user.name || "",
        avatar: ctx.session.user.image || "",
      };
    }
    
    return {
      nickname: profile.nickname || "",
      avatar: profile.avatar || "",
    };
  }),

  // 更新个人资料
  update: protectedProcedure
    .input(
      z.object({
        nickname: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符"),
        avatar: z.string().url("请输入有效的头像URL").optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // 使用 upsert 创建或更新资料
      const profile = await Profile.findOneAndUpdate(
        { userid: userId },
        {
          userid: userId,
          nickname: input.nickname,
          avatar: input.avatar || "",
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );
      
      return {
        nickname: profile.nickname || "",
        avatar: profile.avatar || "",
      };
    }),
});
