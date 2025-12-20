/**
 * 企业成员实体模型
 * 用于存储企业微信中配置了客户联系功能的成员列表
 */

import mongoose from "../mongoose";

const Schema = mongoose.Schema;

const CorpUserSchema = new Schema(
  {
    // 用户ID（所属系统用户）
    userid: { type: String, required: true, index: true },

    // 企业ID
    corpid: { type: String, required: true, index: true },

    // 企业微信成员的userid
    wxUserId: { type: String, required: true },
  },
  { timestamps: true }
);

// 创建复合索引，确保同一企业下不会重复添加相同的成员
CorpUserSchema.index({ userid: 1, corpid: 1, wxUserId: 1 }, { unique: true });

export default mongoose.model('corpUser', CorpUserSchema);