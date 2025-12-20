/**
 * 企业成员同步服务
 * 用于同步企业微信中配置了客户联系功能的成员列表
 */

import CorpUser from "../entity/corpUser";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";
import { getOrRefreshToken } from "./wxwork";

/**
 * 从企业微信API获取接粉号成员列表
 * @param accessToken 企业微信access_token
 * @returns 成员userid列表
 */
async function fetchFollowUserList(accessToken: string): Promise<string[] | null> {
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_follow_user_list?access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[corpUser] API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      follow_user?: string[];
    };

    if (data.errcode !== 0) {
      console.error(`[corpUser] API error: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      return null;
    }

    return data.follow_user || [];
  } catch (error) {
    console.error(`[corpUser] Failed to fetch follow user list:`, error);
    return null;
  }
}

/**
 * 全量同步企业成员
 * @param uid 用户ID
 * @returns 同步结果
 */
export async function syncCorpUsers(uid: string): Promise<{
  success: boolean;
  added: number;
  total: number;
  message: string;
}> {
  try {
    // 获取用户的企业微信配置
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    if (!corpIdSetting || !corpIdSetting.value) {
      return {
        success: false,
        added: 0,
        total: 0,
        message: "未配置企业微信CorpID",
      };
    }

    const corpId = corpIdSetting.value.corpid as string;

    // 获取access_token
    const accessToken = await getOrRefreshToken(uid);
    if (!accessToken) {
      return {
        success: false,
        added: 0,
        total: 0,
        message: "获取access_token失败，请检查企业微信配置",
      };
    }

    // 从API获取接粉号成员列表
    const followUserList = await fetchFollowUserList(accessToken);
    if (!followUserList) {
      return {
        success: false,
        added: 0,
        total: 0,
        message: "获取企业成员列表失败",
      };
    }

    if (followUserList.length === 0) {
      return {
        success: true,
        added: 0,
        total: 0,
        message: "企业中没有配置客户联系功能的成员",
      };
    }

    // 先删除该用户下该企业的所有旧数据
    await CorpUser.deleteMany({ userid: uid, corpid: corpId });

    // 批量插入新数据
    const bulkOps = followUserList.map(wxUserId => ({
      insertOne: {
        document: {
          userid: uid,
          corpid: corpId,
          wxUserId,
        },
      },
    }));

    const result = await CorpUser.bulkWrite(bulkOps, { ordered: false });

    console.log(`[corpUser] Sync completed for user ${uid}: inserted ${result.insertedCount} users`);

    return {
      success: true,
      added: result.insertedCount,
      total: followUserList.length,
      message: `同步成功，共导入 ${result.insertedCount} 个成员`,
    };
  } catch (error) {
    console.error(`[corpUser] Sync failed for user ${uid}:`, error);
    return {
      success: false,
      added: 0,
      total: 0,
      message: `同步失败: ${error}`,
    };
  }
}

/**
 * 获取企业成员列表
 * @param uid 用户ID
 * @returns 企业成员列表
 */
export async function getCorpUsers(uid: string) {
  try {
    // 获取用户的企业微信配置
    console.log(`[corpUser] Getting users for user ${uid}`);
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    console.log(`[corpUser] CorpIdSetting: ${corpIdSetting}`);
    if (!corpIdSetting || !corpIdSetting.value) {
      console.log(`[corpUser] No corpIdSetting found`);
      return {
        users: [],
        hasConfig: false,
        message: "未配置企业微信",
      };
    }

    const corpId = corpIdSetting.value?.corpid as string;

    const users = await CorpUser.find({ userid: uid, corpid: corpId }).sort({ createdAt: -1 });

    return {
      users: users.map(user => ({
        id: user._id.toString(),
        wxUserId: user.wxUserId,
        createdAt: user.createdAt,
      })),
      hasConfig: true,
      corpId,
      total: users.length,
    };
  } catch (error) {
    console.error(`[corpUser] Failed to get users for user ${uid}:`, error);
    return {
      users: [],
      hasConfig: false,
      message: "获取失败",
    };
  }
}