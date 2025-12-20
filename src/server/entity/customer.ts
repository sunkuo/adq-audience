/**
 * 客户实体模型
 * 用于存储企业微信客户的external_userid
 */

import mongoose from "../mongoose";

const Schema = mongoose.Schema;

const CustomerSchema = new Schema(
  {
    // 用户ID（所属系统用户）
    userid: { type: String, required: true, index: true },

    // 企业ID
    corpid: { type: String, required: true, index: true },

    // 企业成员的userid（添加该客户的接粉号）
    wxUserId: { type: String, required: true, index: true },

    // 客户的external_userid
    externalUserid: { type: String, required: true },
  },
  { timestamps: true }
);

// 创建复合索引，确保不会重复添加相同的客户
CustomerSchema.index({ userid: 1, corpid: 1, wxUserId: 1, externalUserid: 1 }, { unique: true });

export default mongoose.model('customer', CustomerSchema);