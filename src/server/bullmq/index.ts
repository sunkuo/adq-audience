/**
 * BullMQ 模块入口
 * 导出装饰器和启动函数
 */

export { Queue_ as Queue, Schedule_ as Schedule, registeredQueues, queueMap } from "./registry";
export { startBullBoard } from "./bull-board.ts";

// 手动导入所有队列和定时任务（装饰器自动注册）
import "./queues/audience";
import "./schedules/audience";
// 新增队列在此导入：
// import "./queues/email";
// import "./schedules/cleanup";
