/**
 * 客户同步任务实体
 */

import { Schema, model, Document } from "mongoose";

export interface SyncCustomerTask extends Document {
  userid: string; // 用户ID
  corpId: string; // 企业微信CorpID
  totalWxUsers: number; // 接粉号总数
  successCount: number; // 成功数量
  failCount: number; // 失败数量
  totalCustomers: number; // 总客户数量
  status: "pending" | "running" | "completed" | "failed"; // 任务状态
  startedAt?: Date; // 开始时间
  completedAt?: Date; // 完成时间
  errorMessage?: string; // 错误信息
  createdAt: Date; // 创建时间（timestamps）
  updatedAt: Date; // 更新时间（timestamps）
}

const syncCustomerTaskSchema = new Schema<SyncCustomerTask>({
  userid: { type: String, required: true, index: true },
  corpId: { type: String, required: true },
  totalWxUsers: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
  totalCustomers: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "running", "completed", "failed"], default: "pending" },
  startedAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String },
}, { timestamps: true });

export default model<SyncCustomerTask>("SyncCustomerTask", syncCustomerTaskSchema);
