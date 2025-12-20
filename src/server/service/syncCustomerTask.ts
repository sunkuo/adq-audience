/**
 * 客户同步任务服务
 */

import { queueMap } from "../bullmq/registry";
import SyncCustomerTask from "../entity/syncCustomerTask";
import SyncCustomerTaskItem from "../entity/syncCustomerTaskItem";
import CorpUser from "../entity/corpUser";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";

/**
 * 创建同步任务
 * @param uid 用户ID
 * @returns 创建的任务信息
 */
export async function createSyncTask(uid: string) {
  console.log(`[sync-task] Creating sync task for user: ${uid}`);

  // 获取用户的企业微信配置
  const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
  if (!corpIdSetting || !corpIdSetting.value) {
    throw new Error("未配置企业微信CorpID");
  }

  const corpId = corpIdSetting.value.corpid as string;
  if (!corpId) {
    throw new Error("企业微信CorpID格式错误");
  }

  // 获取所有接粉号
  const wxUsers = await CorpUser.find({ userid: uid, corpid: corpId });
  if (wxUsers.length === 0) {
    throw new Error("暂无接粉号，请先同步企业成员");
  }

  // 创建任务
  const task = new SyncCustomerTask({
    userid: uid,
    corpId,
    totalWxUsers: wxUsers.length,
    successCount: 0,
    failCount: 0,
    totalCustomers: 0,
    status: "pending",
  });

  await task.save();
  console.log(`[sync-task] Task created: ${task._id}, total wxUsers: ${wxUsers.length}`);

  // 创建任务项
  const taskItems = wxUsers.map(wxUser => ({
    taskId: task._id.toString(),
    wxUserId: wxUser.wxUserId,
    status: "pending" as const,
    customerCount: 0,
    addedCount: 0,
  }));

  await SyncCustomerTaskItem.insertMany(taskItems);
  console.log(`[sync-task] Created ${taskItems.length} task items`);

  return {
    taskId: task._id.toString(),
    totalWxUsers: wxUsers.length,
  };
}

/**
 * 开始执行任务
 * @param taskId 任务ID
 */
export async function startSyncTask(taskId: string) {
  console.log(`[sync-task] Starting task: ${taskId}`);

  const task = await SyncCustomerTask.findById(taskId);
  if (!task) {
    throw new Error("任务不存在");
  }

  if (task.status !== "pending") {
    throw new Error(`任务状态错误: ${task.status}`);
  }

  // 更新任务状态为 running
  task.status = "running";
  task.startedAt = new Date();
  await task.save();

  // 获取待处理的任务项
  const pendingItems = await SyncCustomerTaskItem.find({
    taskId,
    status: "pending",
  });

  if (pendingItems.length === 0) {
    throw new Error("没有待处理的任务项");
  }

  // 获取队列实例
  const queueEntry = queueMap.get("customerSync");
  if (!queueEntry?.queue) {
    throw new Error("队列未找到");
  }
  const queue = queueEntry.queue;

  // 将任务项推送到队列
  for (const item of pendingItems) {
    await queue.add("sync", {
      taskId: item.taskId,
      taskItemId: item._id.toString(),
      wxUserId: item.wxUserId,
      uid: task.userid,
    }, {
      attempts: 3, // 最多重试3次
      backoff: {
        type: "exponential",
        delay: 2000, // 指数退避，初始延迟2秒
      },
    });
  }

  console.log(`[sync-task] Queued ${pendingItems.length} jobs for task ${taskId}`);

  return {
    success: true,
    message: `已开始同步任务，共 ${pendingItems.length} 个接粉号`,
  };
}

/**
 * 重试单个失败的任务项
 * @param taskItemId 任务项ID
 */
export async function retryTaskItem(taskItemId: string) {
  console.log(`[sync-task] Retrying task item: ${taskItemId}`);

  const item = await SyncCustomerTaskItem.findById(taskItemId);
  if (!item) {
    throw new Error("任务项不存在");
  }

  if (item.status !== "failed") {
    throw new Error(`任务项状态错误: ${item.status}`);
  }

  // 获取关联的任务
  const task = await SyncCustomerTask.findById(item.taskId);
  if (!task || task.status === "completed") {
    throw new Error("任务已完成，无法重试");
  }

  // 重置任务项状态
  item.status = "pending";
  item.errorMessage = "";
  item.customerCount = 0;
  item.addedCount = 0;
  item.startedAt = undefined;
  item.completedAt = undefined;
  await item.save();

  // 获取队列实例
  const queueEntry = queueMap.get("customerSync");
  if (!queueEntry?.queue) {
    throw new Error("队列未找到");
  }
  const queue = queueEntry.queue;

  // 推送到队列
  await queue.add("sync", {
    taskId: item.taskId,
    taskItemId: item._id.toString(),
    wxUserId: item.wxUserId,
    uid: task.userid,
  }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });

  console.log(`[sync-task] Retrying item ${taskItemId} for task ${item.taskId}`);

  return {
    success: true,
    message: "已添加重试任务",
  };
}

/**
 * 获取任务详情
 * @param taskId 任务ID
 */
export async function getTaskDetail(taskId: string) {
  const task = await SyncCustomerTask.findById(taskId);
  if (!task) {
    throw new Error("任务不存在");
  }

  const items = await SyncCustomerTaskItem.find({ taskId }).sort({ createdAt: 1 });

  return {
    task,
    items,
  };
}

/**
 * 获取用户的所有任务列表
 * @param uid 用户ID
 */
export async function getTaskList(uid: string) {
  const tasks = await SyncCustomerTask.find({ userid: uid }).sort({ createdAt: -1 }).limit(50);
  return tasks;
}
