import type { Job } from "bullmq";
import { Queue } from "../index";

@Queue("demo", { concurrency: 1, rateLimit: { max: 2, duration: 5000 } })
export class DemoQueue {
  async process(job: Job) {
    console.log("[queue] demo processing", job.data);
    // 你的业务逻辑
  }
}
