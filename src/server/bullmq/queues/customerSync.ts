import type { Job } from "bullmq";
import { Queue } from "../index";
import SyncCustomerTaskItem from "../../entity/syncCustomerTaskItem";
import SyncCustomerTask from "../../entity/syncCustomerTask";
import { syncCustomerListByWxUserId } from "../../service/customer";

interface CustomerSyncJobData {
  taskId: string;
  taskItemId: string;
  wxUserId: string;
  uid: string;
}

@Queue("customerSync", { concurrency: 2, rateLimit: { max: 5, duration: 10000 } })
export class CustomerSyncQueue {
  async process(job: Job<CustomerSyncJobData>) {
    const { taskId, taskItemId, wxUserId, uid } = job.data;

    console.log(`[customer-sync-queue] Processing job for wxUserId: ${wxUserId}, task: ${taskId}, item: ${taskItemId}`);

    try {
      // 更新任务项状态为 running
      await SyncCustomerTaskItem.findByIdAndUpdate(taskItemId, {
        status: "running",
        startedAt: new Date(),
      });

      // 执行同步
      const result = await syncCustomerListByWxUserId(uid, wxUserId);

      if (result.success) {
        // 成功
        await SyncCustomerTaskItem.findByIdAndUpdate(taskItemId, {
          status: "completed",
          completedAt: new Date(),
          customerCount: result.total,
          addedCount: result.added,
        });

        // 更新任务统计
        await SyncCustomerTask.findByIdAndUpdate(taskId, {
          $inc: {
            successCount: 1,
            totalCustomers: result.total,
          },
          updatedAt: new Date(),
        });

        console.log(`[customer-sync-queue] Success: ${wxUserId}, added ${result.added}/${result.total} customers`);
      } else {
        // 失败
        await SyncCustomerTaskItem.findByIdAndUpdate(taskItemId, {
          status: "failed",
          completedAt: new Date(),
          errorMessage: result.message,
        });

        // 更新任务失败统计
        await SyncCustomerTask.findByIdAndUpdate(taskId, {
          $inc: { failCount: 1 },
          updatedAt: new Date(),
        });

        console.log(`[customer-sync-queue] Failed: ${wxUserId}, error: ${result.message}`);
      }

      // 检查任务是否完成
      await this.checkTaskCompletion(taskId);

      return result;
    } catch (error) {
      console.error(`[customer-sync-queue] Error processing job ${job.id}:`, error);

      // 更新任务项为失败
      await SyncCustomerTaskItem.findByIdAndUpdate(taskItemId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // 更新任务失败统计
      await SyncCustomerTask.findByIdAndUpdate(taskId, {
        $inc: { failCount: 1 },
        updatedAt: new Date(),
      });

      await this.checkTaskCompletion(taskId);

      throw error;
    }
  }

  // 检查任务是否完成
  private async checkTaskCompletion(taskId: string) {
    const task = await SyncCustomerTask.findById(taskId);
    if (!task) return;

    const pendingItems = await SyncCustomerTaskItem.countDocuments({
      taskId,
      status: { $in: ["pending", "running"] },
    });

    // 如果没有待处理或运行中的任务项，标记任务完成
    if (pendingItems === 0) {
      const isFailed = task.failCount > 0 && task.successCount === 0;

      await SyncCustomerTask.findByIdAndUpdate(taskId, {
        status: isFailed ? "failed" : "completed",
        completedAt: new Date(),
      });

      console.log(`[customer-sync-queue] Task ${taskId} completed with status: ${isFailed ? "failed" : "completed"}`);
    }
  }
}
