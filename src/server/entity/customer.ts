/**
 * 客户实体模型
 * 用于存储企业微信客户的详细信息
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

    // 客户基本信息
    name: { type: String }, // 客户名称
    position: { type: String }, // 职位
    avatar: { type: String }, // 头像URL
    corpName: { type: String }, // 企业名称
    corpFullName: { type: String }, // 企业全称
    type: { type: Number }, // 客户类型：1-企业微信外部联系人，2-微信用户
    gender: { type: Number }, // 性别：0-未知，1-男性，2-女性
    unionid: { type: String }, // 微信unionid

    // 客户扩展信息
    externalProfile: { type: mongoose.Schema.Types.Mixed }, // 客户扩展信息（JSON对象）

    // 跟进信息
    remark: { type: String }, // 备注
    description: { type: String }, // 描述
    createtime: { type: Number }, // 首次添加时间戳
    tagId: [{ type: String }], // 标签ID列表
    remarkCorpName: { type: String }, // 备注企业名称
    remarkMobiles: [{ type: String }], // 备注手机号列表
    operUserid: { type: String }, // 操作人userid
    addWay: { type: Number }, // 添加方式
    state: { type: String }, // 企业自定义的state参数

    // 视频号信息
    wechatChannels: {
      nickname: { type: String }, // 视频号名称
      source: { type: Number }, // 来源
    },
  },
  { timestamps: true }
);

// 创建复合索引，确保不会重复添加相同的客户
CustomerSchema.index({ userid: 1, corpid: 1, wxUserId: 1, externalUserid: 1 }, { unique: true });

// 为常用查询字段添加索引
CustomerSchema.index({ userid: 1, corpid: 1, createdAt: -1 });
CustomerSchema.index({ wxUserId: 1, externalUserid: 1 });

export default mongoose.model('customer', CustomerSchema);