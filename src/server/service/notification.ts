/**
 * 通知服务
 * 封装通知的创建、删除、已读等操作
 */

import Notification from "../entity/notification";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";
import { sendFeishuNotification, type FeishuMessageType } from "./feishuNotify";

export interface CreateNotificationInput {
  userid: string;
  title: string;
  content: string;
  // 可选：指定飞书通知类型，默认为 info
  feishuType?: FeishuMessageType;
}

export interface NotificationResult {
  _id: string;
  userid: string;
  title: string;
  content: string;
  read: boolean;
  webhook: {
    success: boolean;
    body: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取用户的系统通知设置
 */
async function getNotificationSettings(userid: string) {
  const [systemEnabled, feishuEnabled, feishuWebhookUrl] = await Promise.all([
    Setting.findOne({ userid, key: Settings.SYSTEM_NOTIFICATION_ENABLED }),
    Setting.findOne({ userid, key: Settings.FEISHU_NOTIFICATION_ENABLED }),
    Setting.findOne({ userid, key: Settings.FEISHU_WEBHOOK_URL }),
  ]);

  return {
    systemNotificationEnabled: systemEnabled?.value?.enabled !== false, // 默认开启
    feishuNotificationEnabled: feishuEnabled?.value?.enabled === true, // 默认关闭
    feishuWebhookUrl: (feishuWebhookUrl?.value?.url as string) || "",
  };
}

/**
 * 创建通知
 * 根据用户设置，可能同时发送飞书通知
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationResult> {
  const { userid, title, content, feishuType = "info" } = input;

  // 获取用户通知设置
  const settings = await getNotificationSettings(userid);

  let webhookResult = { success: false, body: {} as Record<string, any> };

  // 如果飞书通知开启且有webhook URL，发送飞书通知
  if (settings.feishuNotificationEnabled && settings.feishuWebhookUrl) {
    webhookResult = await sendFeishuNotification({
      webhookUrl: settings.feishuWebhookUrl,
      type: feishuType,
      title,
      content,
    });
  }

  // 如果系统通知开启，创建系统通知
  if (settings.systemNotificationEnabled) {
    const notification = await Notification.create({
      userid,
      title,
      content,
      read: false,
      webhook: webhookResult,
    });

    return {
      _id: notification._id.toString(),
      userid: notification.userid,
      title: notification.title,
      content: notification.content,
      read: notification.read,
      webhook: webhookResult,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  // 如果系统通知关闭，返回一个虚拟结果
  return {
    _id: "",
    userid,
    title,
    content,
    read: true,
    webhook: webhookResult,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 获取用户的通知列表
 */
export async function getNotifications(
  userid: string,
  options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }
) {
  const { page = 1, limit = 20, unreadOnly = false } = options || {};

  const query: Record<string, any> = { userid };
  if (unreadOnly) {
    query.read = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
  ]);

  return {
    items: notifications.map((n) => ({
      _id: n._id.toString(),
      userid: n.userid,
      title: n.title,
      content: n.content,
      read: n.read,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userid: string): Promise<number> {
  return Notification.countDocuments({ userid, read: false });
}

/**
 * 标记单个通知为已读
 */
export async function markAsRead(
  userid: string,
  notificationId: string
): Promise<boolean> {
  const result = await Notification.updateOne(
    { _id: notificationId, userid },
    { read: true }
  );
  return result.modifiedCount > 0;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userid: string): Promise<number> {
  const result = await Notification.updateMany(
    { userid, read: false },
    { read: true }
  );
  return result.modifiedCount;
}

/**
 * 删除单个通知
 */
export async function deleteNotification(
  userid: string,
  notificationId: string
): Promise<boolean> {
  const result = await Notification.deleteOne({ _id: notificationId, userid });
  return result.deletedCount > 0;
}

/**
 * 删除所有已读通知
 */
export async function deleteAllReadNotifications(
  userid: string
): Promise<number> {
  const result = await Notification.deleteMany({ userid, read: true });
  return result.deletedCount;
}

/**
 * 删除用户所有通知
 */
export async function deleteAllNotifications(userid: string): Promise<number> {
  const result = await Notification.deleteMany({ userid });
  return result.deletedCount;
}
