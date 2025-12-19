/**
 * 企业微信access_token服务
 * 使用Redis管理access_token，提供getToken和setToken函数
 */

import redis from "../redis";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";

/**
 * 获取Redis key
 * @param uid 用户ID
 * @param corpId 企业ID
 * @returns Redis key
 */
function getRedisKey(uid: string, corpId: string): string {
  return `wxwork:token:${uid}:${corpId}`;
}

/**
 * 从Redis获取access_token
 * @param uid 用户ID
 * @param corpId 企业ID
 * @returns access_token或null
 */
export async function getToken(uid: string, corpId: string): Promise<string | null> {
  const key = getRedisKey(uid, corpId);
  try {
    const token = await redis.get(key);
    return token;
  } catch (error) {
    console.error(`[wxwork] Failed to get token for uid=${uid}, corpId=${corpId}:`, error);
    return null;
  }
}

/**
 * 将access_token保存到Redis
 * @param uid 用户ID
 * @param corpId 企业ID
 * @param token access_token
 * @param expiresIn 有效期（秒），默认7200秒（2小时）
 * @returns 是否成功
 */
export async function setToken(
  uid: string,
  corpId: string,
  token: string,
  expiresIn: number = 7200
): Promise<boolean> {
  const key = getRedisKey(uid, corpId);
  try {
    // 设置过期时间，留10秒缓冲期
    const ttl = Math.max(10, expiresIn - 10);
    await redis.set(key, token, "EX", ttl);
    return true;
  } catch (error) {
    console.error(`[wxwork] Failed to set token for uid=${uid}, corpId=${corpId}:`, error);
    return false;
  }
}

/**
 * 从Redis删除access_token
 * @param uid 用户ID
 * @param corpId 企业ID
 * @returns 是否成功
 */
export async function deleteToken(uid: string, corpId: string): Promise<boolean> {
  const key = getRedisKey(uid, corpId);
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[wxwork] Failed to delete token for uid=${uid}, corpId=${corpId}:`, error);
    return false;
  }
}

/**
 * 从企业微信API获取新的access_token
 * @param corpId 企业ID
 * @param corpSecret 应用凭证密钥
 * @returns access_token信息
 */
async function fetchTokenFromAPI(corpId: string, corpSecret: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
    console.log(`[wxwork] Fetching token from API: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[wxwork] API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      access_token?: string;
      expires_in?: number;
    };

    if (data.errcode !== 0) {
      console.error(`[wxwork] API error: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      return null;
    }

    if (!data.access_token || !data.expires_in) {
      console.error(`[wxwork] API response missing access_token or expires_in`);
      return null;
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error(`[wxwork] Failed to fetch token from API:`, error);
    return null;
  }
}

/**
 * 刷新指定用户的access_token
 * @param uid 用户ID
 * @returns 是否成功
 */
export async function refreshUserToken(uid: string): Promise<boolean> {
  try {
    // 获取用户的微信配置
    const [corpIdSetting, corpSecretSetting] = await Promise.all([
      Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID }),
      Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPSECRET }),
    ]);

    if (!corpIdSetting || !corpSecretSetting) {
      console.log(`[wxwork] User ${uid} has no wxwork config`);
      return false;
    }

    const corpId = corpIdSetting.value.corpid as string;
    const corpSecret = corpSecretSetting.value.corpsecret as string;

    if (!corpId || !corpSecret) {
      console.log(`[wxwork] User ${uid} has invalid wxwork config`);
      return false;
    }

    // 从API获取新token
    const tokenData = await fetchTokenFromAPI(corpId, corpSecret);
    if (!tokenData) {
      return false;
    }

    // 保存到Redis
    const success = await setToken(uid, corpId, tokenData.access_token, tokenData.expires_in);
    if (success) {
      console.log(`[wxwork] Successfully refreshed token for user ${uid}`);
    }
    return success;
  } catch (error) {
    console.error(`[wxwork] Failed to refresh token for user ${uid}:`, error);
    return false;
  }
}

/**
 * 刷新所有用户的access_token
 * @returns 刷新结果统计
 */
export async function refreshAllUserTokens(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  console.log(`[wxwork] Starting to refresh all user tokens...`);

  // 获取所有配置了企业微信的用户
  // 通过查找WECHAT_WORK_CORPID设置来确定哪些用户配置了企业微信
  const wxworkUsers = await Setting.find({
    key: Settings.WECHAT_WORK_CORPID
  }).distinct('userid');

  const results = {
    success: 0,
    failed: 0,
    total: wxworkUsers.length,
  };

  if (wxworkUsers.length === 0) {
    console.log(`[wxwork] No users with wxwork config found`);
    return results;
  }

  console.log(`[wxwork] Found ${wxworkUsers.length} users to refresh`);

  // 逐个刷新用户的token
  for (const uid of wxworkUsers) {
    const success = await refreshUserToken(uid);
    if (success) {
      results.success++;
    } else {
      results.failed++;
    }
  }

  console.log(`[wxwork] Refresh completed: ${results.success} success, ${results.failed} failed, ${results.total} total`);
  return results;
}

/**
 * 获取access_token（优先从Redis获取，如果不存在则从API获取并缓存）
 * @param uid 用户ID
 * @returns access_token或null
 */
export async function getOrRefreshToken(uid: string): Promise<string | null> {
  try {
    // 获取用户配置
    const [corpIdSetting, corpSecretSetting] = await Promise.all([
      Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID }),
      Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPSECRET }),
    ]);

    if (!corpIdSetting || !corpSecretSetting) {
      return null;
    }

    const corpId = corpIdSetting.value.corpid as string;
    const corpSecret = corpSecretSetting.value.corpsecret as string;

    if (!corpId || !corpSecret) {
      return null;
    }

    // 先尝试从Redis获取
    const cachedToken = await getToken(uid, corpId);
    if (cachedToken) {
      return cachedToken;
    }

    // Redis中没有，从API获取并缓存
    const tokenData = await fetchTokenFromAPI(corpId, corpSecret);
    if (!tokenData) {
      return null;
    }

    await setToken(uid, corpId, tokenData.access_token, tokenData.expires_in);
    return tokenData.access_token;
  } catch (error) {
    console.error(`[wxwork] Failed to get/refresh token for user ${uid}:`, error);
    return null;
  }
}