import type { Job } from "bullmq";
import { Queue } from "../index";

@Queue("audience", { concurrency: 1, rateLimit: { max: 2, duration: 5000 } })
export class AudienceQueue {
  async process(job: Job) {
    console.log("[queue] audience processing", job.data);
    // 你的业务逻辑
  }
}
