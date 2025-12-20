/**
 * 客户同步任务项实体（每个接粉号的同步详情）
 */

import { Schema, model, Document } from "mongoose";

export interface SyncCustomerTaskItem extends Document {
  taskId: string; // 任务ID
  wxUserId: string; // 接粉号userid
  status: "pending" | "running" | "completed" | "failed"; // 状态
  customerCount: number; // 客户数量
  addedCount: number; // 新增数量
  errorMessage?: string; // 错误信息
  startedAt?: Date; // 开始时间
  completedAt?: Date; // 完成时间
  createdAt: Date; // 创建时间（timestamps）
  updatedAt: Date; // 更新时间（timestamps）
}

const syncCustomerTaskItemSchema = new Schema<SyncCustomerTaskItem>({
  taskId: { type: String, required: true, index: true },
  wxUserId: { type: String, required: true },
  status: { type: String, enum: ["pending", "running", "completed", "failed"], default: "pending" },
  customerCount: { type: Number, default: 0 },
  addedCount: { type: Number, default: 0 },
  errorMessage: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

export default model<SyncCustomerTaskItem>("SyncCustomerTaskItem", syncCustomerTaskItemSchema);
