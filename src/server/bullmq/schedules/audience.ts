import type { Job } from "bullmq";
import { Schedule } from "../index";

@Schedule("audience", { every: 10000, data: { source: "scheduler" } })
export class AudienceSchedule {
  async process(job: Job) {
    console.log("[schedule] audience processing", job.data);
    // 你的定时任务逻辑
  }
}
