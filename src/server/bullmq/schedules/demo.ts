import type { Job } from "bullmq";
import { Schedule } from "../index";

@Schedule("demo", { every: 10000, data: { source: "scheduler" } })
export class DemoSchedule {
  async process(job: Job) {
    console.log("[schedule] demo processing", job.data);
    // 你的定时任务逻辑
  }
}
