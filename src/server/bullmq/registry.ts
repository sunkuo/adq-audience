/**
 * BullMQ 队列注册中心
 * 自动收集所有 @Queue 和 @Schedule 装饰的队列
 */

import { Queue, Worker, type Job, type Processor } from "bullmq";
import connection from "../ioredis";

// 全局队列注册表
export const registeredQueues: Queue[] = [];

// 存储队列和 worker 的映射，方便外部访问
export const queueMap = new Map<string, { queue: Queue; worker: Worker }>();

interface QueueOptions {
  concurrency?: number;
  rateLimit?: { max: number; duration: number };
}

interface ScheduleOptions {
  every?: number; // 毫秒
  cron?: string; // cron 表达式
  data?: Record<string, unknown>;
}

// 定义带有 process 方法的类类型
type ProcessorClass = new () => { process: Processor };

/**
 * @Queue 装饰器 - 创建普通队列
 * @param name 队列名称
 * @param options 队列配置
 */
export function Queue_(name: string, options?: QueueOptions) {
  return function <T extends ProcessorClass>(constructor: T): T {
    const queueName = `queue-${name}`;
    const tag = `[queue] ${name}`;

    const queue = new Queue(queueName, { connection });

    // 应用配置
    if (options?.concurrency) {
      queue.setGlobalConcurrency(options.concurrency);
    }
    if (options?.rateLimit) {
      queue.setGlobalRateLimit(
        options.rateLimit.max,
        options.rateLimit.duration
      );
    }

    // 创建实例获取 process 方法
    const instance = new constructor();

    // 创建 Worker
    const worker = new Worker(queueName, instance.process.bind(instance), {
      connection,
      removeOnComplete: { count: 3 },
      removeOnFail: { age: 1000 * 60 * 60 * 24 },
    });

    worker.on("completed", (job: Job) => {
      console.log(tag, "completed", job.id);
    });

    worker.on("failed", (job: Job | undefined, error: Error) => {
      console.log(tag, "failed", job?.id, error.message);
    });

    // 注册到全局
    registeredQueues.push(queue);
    queueMap.set(name, { queue, worker });
    console.log(tag, "registered");

    return constructor;
  };
}

/**
 * @Schedule 装饰器 - 创建定时任务队列
 * @param name 任务名称
 * @param schedule 定时配置
 */
export function Schedule_(name: string, schedule: ScheduleOptions) {
  return function <T extends ProcessorClass>(constructor: T): T {
    const queueName = `schedule-${name}`;
    const tag = `[schedule] ${name}`;

    const queue = new Queue(queueName, { connection });

    // 创建实例获取 process 方法
    const instance = new constructor();

    // 注册定时任务
    const scheduleConfig: { every?: number; pattern?: string } = {};
    if (schedule.every) scheduleConfig.every = schedule.every;
    if (schedule.cron) scheduleConfig.pattern = schedule.cron;

    queue.upsertJobScheduler(queueName, scheduleConfig, {
      name,
      data: schedule.data || {},
      opts: {},
    });

    // 创建 Worker
    const worker = new Worker(queueName, instance.process.bind(instance), {
      connection,
      removeOnComplete: { count: 3 },
      removeOnFail: { count: 3 },
    });

    worker.on("completed", (job: Job) => {
      console.log(tag, "completed", job.id);
    });

    worker.on("failed", (job: Job | undefined, error: Error) => {
      console.log(tag, "failed", job?.id, error.message);
    });

    // 注册到全局
    registeredQueues.push(queue);
    queueMap.set(`schedule-${name}`, { queue, worker });
    console.log(tag, "registered");

    return constructor;
  };
}
