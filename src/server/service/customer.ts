/**
 * 客户同步服务（第一阶段）
 * 用于同步企业微信客户的external_userid列表
 */

import Customer from "../entity/customer";
import CorpUser from "../entity/corpUser";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";
import { getOrRefreshToken } from "./wxwork";

/**
 * 从企业微信API获取指定成员的客户列表
 * @param accessToken 企业微信access_token
 * @param wxUserId 企业成员的userid
 * @returns 客户external_userid列表
 */
async function fetchCustomerList(accessToken: string, wxUserId: string): Promise<string[] | null> {
  console.log(`[customer] Starting fetchCustomerList for wxUserId: ${wxUserId}`);
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${wxUserId}`;
    console.log(`[customer] API URL: ${url.replace(accessToken, '***')}`);

    const response = await fetch(url);
    console.log(`[customer] API response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[customer] API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      external_userid?: string[];
    };

    console.log(`[customer] API response data: errcode=${data.errcode}, errmsg=${data.errmsg}, external_userid count=${data.external_userid?.length || 0}`);

    if (data.errcode !== 0) {
      console.error(`[customer] API error: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      return null;
    }

    const result = data.external_userid || [];
    console.log(`[customer] fetchCustomerList success for ${wxUserId}: found ${result.length} customers`);
    return result;
  } catch (error) {
    console.error(`[customer] Failed to fetch customer list for ${wxUserId}:`, error);
    return null;
  }
}

/**
 * 同步指定接粉号的客户列表（第一阶段）
 * @param uid 用户ID
 * @param wxUserId 企业成员的userid
 * @returns 同步结果
 */
export async function syncCustomerListByWxUserId(uid: string, wxUserId: string): Promise<{
  success: boolean;
  added: number;
  total: number;
  message: string;
}> {
  console.log(`[customer] ===== syncCustomerListByWxUserId START =====`);
  console.log(`[customer] uid: ${uid}, wxUserId: ${wxUserId}`);
  try {
    // 获取用户的企业微信配置
    console.log(`[customer] Step 1: Fetching corpId setting for uid: ${uid}`);
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    console.log(`[customer] corpIdSetting: ${JSON.stringify(corpIdSetting)}`);
    if (!corpIdSetting || !corpIdSetting.value) {
      console.log(`[customer] No corpId setting found, returning error`);
      return {
        success: false,
        added: 0,
        total: 0,
        message: "未配置企业微信CorpID",
      };
    }

    const corpId = corpIdSetting.value.corpid as string;
    console.log(`[customer] Step 2: corpId = ${corpId}`);
    if (!corpId) {
      console.log(`[customer] corpId is empty, returning error`);
      return {
        success: false,
        added: 0,
        total: 0,
        message: "企业微信CorpID格式错误",
      };
    }

    // 获取access_token
    console.log(`[customer] Step 3: Getting access token for uid: ${uid}`);
    const accessToken = await getOrRefreshToken(uid);
    console.log(`[customer] accessToken received: ${accessToken ? 'yes' : 'no'}`);
    if (!accessToken) {
      console.log(`[customer] Failed to get access token`);
      return {
        success: false,
        added: 0,
        total: 0,
        message: "获取access_token失败，请检查企业微信配置",
      };
    }

    // 从API获取客户列表
    console.log(`[customer] Step 4: Fetching customer list from API`);
    const customerList = await fetchCustomerList(accessToken, wxUserId);
    console.log(`[customer] customerList: ${customerList ? `array with ${customerList.length} items` : 'null'}`);
    if (!customerList) {
      console.log(`[customer] customerList is null, returning error`);
      return {
        success: false,
        added: 0,
        total: 0,
        message: "获取客户列表失败",
      };
    }

    if (customerList.length === 0) {
      console.log(`[customer] customerList is empty, no customers to sync`);
      return {
        success: true,
        added: 0,
        total: 0,
        message: "该成员暂无客户",
      };
    }

    // 批量插入新数据（只插入不存在的记录）
    console.log(`[customer] Step 5: Preparing bulk insert operations for ${customerList.length} customers`);
    const bulkOps = customerList.map(externalUserid => ({
      insertOne: {
        document: {
          userid: uid,
          corpid: corpId,
          wxUserId,
          externalUserid,
        },
      },
    }));

    console.log(`[customer] Step 6: Executing bulkWrite with ${bulkOps.length} operations`);
    const result = await Customer.bulkWrite(bulkOps, { ordered: false });

    console.log(`[customer] Step 7: BulkWrite result: inserted=${result.insertedCount}, errors=${result.getWriteErrors()}`);
    console.log(`[customer] ===== syncCustomerListByWxUserId END - SUCCESS =====`);
    console.log(`[customer] Sync completed for user ${uid}, wxUserId ${wxUserId}: inserted ${result.insertedCount} customers`);

    return {
      success: true,
      added: result.insertedCount,
      total: customerList.length,
      message: `同步成功，共导入 ${result.insertedCount} 个客户`,
    };
  } catch (error) {
    console.error(`[customer] ===== syncCustomerListByWxUserId END - ERROR =====`);
    console.error(`[customer] Sync failed for user ${uid}, wxUserId ${wxUserId}:`, error);
    return {
      success: false,
      added: 0,
      total: 0,
      message: `同步失败: ${error}`,
    };
  }
}

/**
 * 同步所有接粉号的客户列表（第一阶段）
 * @param uid 用户ID
 * @returns 同步结果
 */
export async function syncAllCustomers(uid: string): Promise<{
  success: boolean;
  totalAdded: number;
  totalWxUsers: number;
  totalCustomers: number;
  results: Array<{ wxUserId: string; added: number; total: number; success: boolean; message: string }>;
  message: string;
}> {
  console.log(`[customer] ===== syncAllCustomers START =====`);
  console.log(`[customer] uid: ${uid}`);
  try {
    // 获取用户的企业微信配置
    console.log(`[customer] Step 1: Fetching corpId setting for uid: ${uid}`);
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    console.log(`[customer] corpIdSetting: ${JSON.stringify(corpIdSetting)}`);
    if (!corpIdSetting || !corpIdSetting.value) {
      console.log(`[customer] No corpId setting found, returning error`);
      return {
        success: false,
        totalAdded: 0,
        totalWxUsers: 0,
        totalCustomers: 0,
        results: [],
        message: "未配置企业微信CorpID",
      };
    }

    const corpId = corpIdSetting.value.corpid as string;
    console.log(`[customer] Step 2: corpId = ${corpId}`);
    if (!corpId) {
      console.log(`[customer] corpId is empty, returning error`);
      return {
        success: false,
        totalAdded: 0,
        totalWxUsers: 0,
        totalCustomers: 0,
        results: [],
        message: "企业微信CorpID格式错误",
      };
    }

    // 获取所有接粉号
    console.log(`[customer] Step 3: Fetching corpUsers for uid: ${uid}, corpId: ${corpId}`);
    const wxUsers = await CorpUser.find({ userid: uid, corpid: corpId });
    console.log(`[customer] Found ${wxUsers.length} corpUsers: ${wxUsers.map(u => u.wxUserId).join(', ')}`);
    if (wxUsers.length === 0) {
      console.log(`[customer] No corpUsers found, returning error`);
      return {
        success: false,
        totalAdded: 0,
        totalWxUsers: 0,
        totalCustomers: 0,
        results: [],
        message: "暂无接粉号，请先同步企业成员",
      };
    }

    // 逐个同步每个接粉号的客户
    console.log(`[customer] Step 4: Starting sync for each corpUser`);
    const results = [];
    let totalAdded = 0;
    let totalCustomers = 0;

    for (let i = 0; i < wxUsers.length; i++) {
      const wxUser = wxUsers[i]!;
      console.log(`[customer] Processing [${i + 1}/${wxUsers.length}]: wxUserId=${wxUser.wxUserId}`);

      const result = await syncCustomerListByWxUserId(uid, wxUser.wxUserId);

      results.push({
        wxUserId: wxUser.wxUserId,
        added: result.added,
        total: result.total,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        totalAdded += result.added;
        totalCustomers += result.total;
        console.log(`[customer] [${i + 1}/${wxUsers.length}] Success: added=${result.added}, total=${result.total}`);
      } else {
        console.log(`[customer] [${i + 1}/${wxUsers.length}] Failed: ${result.message}`);
      }
    }

    console.log(`[customer] Step 5: All corpUsers processed`);
    console.log(`[customer] Summary: totalWxUsers=${wxUsers.length}, totalAdded=${totalAdded}, totalCustomers=${totalCustomers}`);
    console.log(`[customer] ===== syncAllCustomers END - SUCCESS =====`);

    return {
      success: true,
      totalAdded,
      totalWxUsers: wxUsers.length,
      totalCustomers,
      results,
      message: `同步完成，共处理 ${wxUsers.length} 个接粉号，导入 ${totalAdded} 个客户`,
    };
  } catch (error) {
    console.error(`[customer] ===== syncAllCustomers END - ERROR =====`);
    console.error(`[customer] Sync all failed for user ${uid}:`, error);
    return {
      success: false,
      totalAdded: 0,
      totalWxUsers: 0,
      totalCustomers: 0,
      results: [],
      message: `批量同步失败: ${error}`,
    };
  }
}

/**
 * 获取客户列表（第一阶段 - 只有external_userid）
 * @param uid 用户ID
 * @param page 页码，默认1
 * @param pageSize 每页数量，默认20
 * @returns 客户列表（带分页）
 */
export async function getCustomers(uid: string, page: number = 1, pageSize: number = 20) {
  console.log(`[customer] ===== getCustomers START =====`);
  console.log(`[customer] uid: ${uid}, page: ${page}, pageSize: ${pageSize}, type of page: ${typeof page}`);
  try {
    // 获取用户的企业微信配置
    console.log(`[customer] Step 1: Fetching corpId setting for uid: ${uid}`);
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    console.log(`[customer] corpIdSetting: ${JSON.stringify(corpIdSetting)}`);
    if (!corpIdSetting || !corpIdSetting.value) {
      console.log(`[customer] No corpId setting found, returning empty list`);
      return {
        customers: [],
        hasConfig: false,
        message: "未配置企业微信",
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const corpId = corpIdSetting.value.corpid as string;
    console.log(`[customer] Step 2: corpId = ${corpId}`);
    if (!corpId) {
      console.log(`[customer] corpId is empty, returning empty list`);
      return {
        customers: [],
        hasConfig: false,
        message: "企业微信CorpID格式错误",
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // 计算分页偏移量
    const skip = (page - 1) * pageSize;
    console.log(`[customer] Step 3: Fetching customers from DB for uid: ${uid}, corpId: ${corpId}, skip: ${skip}, limit: ${pageSize}`);

    // 获取总数
    const total = await Customer.countDocuments({ userid: uid, corpid: corpId });
    console.log(`[customer] Total customers in database: ${total}`);

    // 获取分页数据
    const customers = await Customer.find({ userid: uid, corpid: corpId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    console.log(`[customer] Found ${customers.length} customers for page ${page}`);

    const totalPages = Math.ceil(total / pageSize);
    const result = {
      customers: customers.map(customer => ({
        id: customer._id.toString(),
        wxUserId: customer.wxUserId,
        externalUserid: customer.externalUserid,
        createdAt: customer.createdAt,
      })),
      hasConfig: true,
      corpId,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };

    console.log(`[customer] Step 4: Returning ${result.customers.length} customers (page ${page}/${totalPages})`);
    console.log(`[customer] ===== getCustomers END - SUCCESS =====`);

    return result;
  } catch (error) {
    console.error(`[customer] ===== getCustomers END - ERROR =====`);
    console.error(`[customer] Failed to get customers for user ${uid}:`, error);
    return {
      customers: [],
      hasConfig: false,
      message: "获取失败",
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  }
}