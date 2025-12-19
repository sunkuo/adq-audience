import type { Job } from "bullmq";
import { Schedule } from "../index";
import { refreshAllUserTokens } from "../../service/wxwork";

/**
 * 企业微信access_token定时刷新任务
 * 每1小时刷新所有用户的access_token
 */
@Schedule("wxwork-token-refresh", {
  cron: "0 * * * *", // 每小时的第0分钟执行（每小时一次）
  data: { source: "wxwork-scheduler" }
})
export class WxWorkTokenRefreshSchedule {
  async process(job: Job) {
    console.log("[wxwork-schedule] Starting token refresh...", job.data);

    try {
      const result = await refreshAllUserTokens();
      console.log("[wxwork-schedule] Token refresh completed:", result);

      // 返回结果供监控
      return result;
    } catch (error) {
      console.error("[wxwork-schedule] Token refresh failed:", error);
      throw error;
    }
  }
}