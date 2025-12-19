/**
 * 系统设置相关的 tRPC router
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";
import { sendFeishuNotification } from "../service/feishuNotify";

// 通知设置返回类型
interface NotificationSettings {
  systemNotificationEnabled: boolean;
  feishuNotificationEnabled: boolean;
  feishuWebhookUrl: string;
  wechatWorkCorpid: string;
  wechatWorkCorpsecret: string;
  wechatWorkRemark: string;
}

export const settingRouter = router({
  // 获取通知相关设置
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [
      systemEnabled,
      feishuEnabled,
      feishuWebhookUrl,
      wechatWorkCorpid,
      wechatWorkCorpsecret,
      wechatWorkRemark,
    ] = await Promise.all([
      Setting.findOne({ userid: userId, key: Settings.SYSTEM_NOTIFICATION_ENABLED }),
      Setting.findOne({ userid: userId, key: Settings.FEISHU_NOTIFICATION_ENABLED }),
      Setting.findOne({ userid: userId, key: Settings.FEISHU_WEBHOOK_URL }),
      Setting.findOne({ userid: userId, key: Settings.WECHAT_WORK_CORPID }),
      Setting.findOne({ userid: userId, key: Settings.WECHAT_WORK_CORPSECRET }),
      Setting.findOne({ userid: userId, key: Settings.WECHAT_WORK_REMARK }),
    ]);

    return {
      systemNotificationEnabled: systemEnabled?.value?.enabled !== false, // 默认开启
      feishuNotificationEnabled: feishuEnabled?.value?.enabled === true, // 默认关闭
      feishuWebhookUrl: (feishuWebhookUrl?.value?.url as string) || "",
      wechatWorkCorpid: (wechatWorkCorpid?.value?.corpid as string) || "",
      wechatWorkCorpsecret: (wechatWorkCorpsecret?.value?.corpsecret as string) || "",
      wechatWorkRemark: (wechatWorkRemark?.value?.remark as string) || "",
    } as NotificationSettings;
  }),

  // 更新系统内通知开关
  updateSystemNotification: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await Setting.findOneAndUpdate(
        { userid: userId, key: Settings.SYSTEM_NOTIFICATION_ENABLED },
        {
          userid: userId,
          key: Settings.SYSTEM_NOTIFICATION_ENABLED,
          value: { enabled: input.enabled },
        },
        { upsert: true, new: true }
      );

      return { success: true, enabled: input.enabled };
    }),

  // 更新飞书通知开关
  updateFeishuNotification: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await Setting.findOneAndUpdate(
        { userid: userId, key: Settings.FEISHU_NOTIFICATION_ENABLED },
        {
          userid: userId,
          key: Settings.FEISHU_NOTIFICATION_ENABLED,
          value: { enabled: input.enabled },
        },
        { upsert: true, new: true }
      );

      return { success: true, enabled: input.enabled };
    }),

  // 更新飞书Webhook URL
  updateFeishuWebhookUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().url("请输入有效的URL").or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await Setting.findOneAndUpdate(
        { userid: userId, key: Settings.FEISHU_WEBHOOK_URL },
        {
          userid: userId,
          key: Settings.FEISHU_WEBHOOK_URL,
          value: { url: input.url },
        },
        { upsert: true, new: true }
      );

      return { success: true, url: input.url };
    }),

  // 测试飞书通知
  testFeishuNotification: protectedProcedure
    .input(
      z.object({
        webhookUrl: z.string().url("请输入有效的URL"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendFeishuNotification({
        webhookUrl: input.webhookUrl,
        type: "info",
        title: "测试通知",
        content: "这是一条测试消息，用于验证飞书通知配置是否正确。\n\n如果您看到此消息，说明配置成功！",
      });

      return result;
    }),

  // 批量更新通知设置
  updateAllNotificationSettings: protectedProcedure
    .input(
      z.object({
        systemNotificationEnabled: z.boolean().optional(),
        feishuNotificationEnabled: z.boolean().optional(),
        feishuWebhookUrl: z.string().url("请输入有效的URL").or(z.literal("")).optional(),
        wechatWorkCorpid: z.string().optional(),
        wechatWorkCorpsecret: z.string().optional(),
        wechatWorkRemark: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const updates: Promise<any>[] = [];

      if (input.systemNotificationEnabled !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.SYSTEM_NOTIFICATION_ENABLED },
            {
              userid: userId,
              key: Settings.SYSTEM_NOTIFICATION_ENABLED,
              value: { enabled: input.systemNotificationEnabled },
            },
            { upsert: true, new: true }
          )
        );
      }

      if (input.feishuNotificationEnabled !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.FEISHU_NOTIFICATION_ENABLED },
            {
              userid: userId,
              key: Settings.FEISHU_NOTIFICATION_ENABLED,
              value: { enabled: input.feishuNotificationEnabled },
            },
            { upsert: true, new: true }
          )
        );
      }

      if (input.feishuWebhookUrl !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.FEISHU_WEBHOOK_URL },
            {
              userid: userId,
              key: Settings.FEISHU_WEBHOOK_URL,
              value: { url: input.feishuWebhookUrl },
            },
            { upsert: true, new: true }
          )
        );
      }

      if (input.wechatWorkCorpid !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.WECHAT_WORK_CORPID },
            {
              userid: userId,
              key: Settings.WECHAT_WORK_CORPID,
              value: { corpid: input.wechatWorkCorpid },
            },
            { upsert: true, new: true }
          )
        );
      }

      if (input.wechatWorkCorpsecret !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.WECHAT_WORK_CORPSECRET },
            {
              userid: userId,
              key: Settings.WECHAT_WORK_CORPSECRET,
              value: { corpsecret: input.wechatWorkCorpsecret },
            },
            { upsert: true, new: true }
          )
        );
      }

      if (input.wechatWorkRemark !== undefined) {
        updates.push(
          Setting.findOneAndUpdate(
            { userid: userId, key: Settings.WECHAT_WORK_REMARK },
            {
              userid: userId,
              key: Settings.WECHAT_WORK_REMARK,
              value: { remark: input.wechatWorkRemark },
            },
            { upsert: true, new: true }
          )
        );
      }

      await Promise.all(updates);

      return { success: true };
    }),
});
