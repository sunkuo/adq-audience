/**
 * 客户同步服务
 * 用于同步企业微信客户的详细信息
 */

import Customer from "../entity/customer";
import CorpUser from "../entity/corpUser";
import Setting from "../entity/setting";
import { Settings } from "../enum/Settings";
import { getOrRefreshToken } from "./wxwork";
import fs from "fs";
import path from "path";

interface ExternalContact {
  external_userid: string;
  name?: string;
  position?: string;
  avatar?: string;
  corp_name?: string;
  corp_full_name?: string;
  type?: number;
  gender?: number;
  unionid?: string;
  external_profile?: {
    external_attr?: Array<{
      type: number;
      name: string;
      text?: { value: string };
      web?: { url: string; title: string };
      miniprogram?: { appid: string; pagepath: string; title: string };
    }>;
  };
}

interface FollowInfo {
  userid: string;
  remark?: string;
  description?: string;
  createtime?: number;
  tag_id?: string[];
  remark_corp_name?: string;
  remark_mobiles?: string[];
  oper_userid?: string;
  add_way?: number;
  state?: string;
  wechat_channels?: {
    nickname?: string;
    source?: number;
  };
}

interface BatchGetByUserResponse {
  errcode: number;
  errmsg: string;
  external_contact_list?: Array<{
    external_contact: ExternalContact;
    follow_info: FollowInfo;
  }>;
  next_cursor?: string;
  fail_info?: {
    unlicensed_userid_list?: string[];
  };
}

/**
 * 从企业微信API批量获取客户详情（支持分页）
 * @param accessToken 企业微信access_token
 * @param wxUserIdList 企业成员的userid列表，最多100个
 * @param cursor 分页游标，首次调用可不传
 * @param limit 每次返回的最大记录数，默认100，最大100
 * @returns 客户详情列表和下一页游标
 */
async function fetchCustomerDetails(
  accessToken: string,
  wxUserIdList: string[],
  cursor?: string,
  limit: number = 100
): Promise<{
  customers: Array<{
    externalContact: ExternalContact;
    followInfo: FollowInfo;
  }>;
  nextCursor?: string;
} | null> {
  console.log(`[customer] Starting fetchCustomerDetails for wxUserIdList: ${JSON.stringify(wxUserIdList)}, cursor: ${cursor || 'empty'}`);
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/batch/get_by_user?access_token=${accessToken}`;
    console.log(`[customer] API URL: ${url.replace(accessToken, '***')}`);

    const body = {
      userid_list: wxUserIdList,
      cursor: cursor || "",
      limit: Math.min(limit, 100), // 确保不超过最大值
    };

    console.log(`[customer] API request body: ${JSON.stringify(body)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`[customer] API response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[customer] API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json() as BatchGetByUserResponse;

    console.log(`[customer] API response data: errcode=${data.errcode}, errmsg=${data.errmsg}`);

    if (data.errcode !== 0) {
      console.error(`[customer] API error: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      return null;
    }

    const customers = data.external_contact_list?.map(item => ({
      externalContact: item.external_contact,
      followInfo: item.follow_info,
    })) || [];

    console.log(`[customer] fetchCustomerDetails success: found ${customers.length} customers, nextCursor: ${data.next_cursor || 'none'}`);

    return {
      customers,
      nextCursor: data.next_cursor,
    };
  } catch (error) {
    console.error(`[customer] Failed to fetch customer details:`, error);
    return null;
  }
}

/**
 * 递归获取所有客户详情（处理分页）
 * @param accessToken 企业微信access_token
 * @param wxUserIdList 企业成员的userid列表
 * @param cursor 初始游标
 * @param limit 每次请求的限制数
 * @returns 所有客户详情列表
 */
async function fetchAllCustomerDetails(
  accessToken: string,
  wxUserIdList: string[],
  cursor?: string,
  limit: number = 100
): Promise<Array<{
  externalContact: ExternalContact;
  followInfo: FollowInfo;
}>> {
  const allCustomers: Array<{
    externalContact: ExternalContact;
    followInfo: FollowInfo;
  }> = [];

  let currentCursor = cursor;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchCustomerDetails(accessToken, wxUserIdList, currentCursor, limit);

    if (!result) {
      console.error(`[customer] Failed to fetch customer details in recursive loop`);
      break;
    }

    allCustomers.push(...result.customers);

    if (result.nextCursor) {
      currentCursor = result.nextCursor;
      console.log(`[customer] Continuing with next cursor: ${currentCursor}`);
    } else {
      hasMore = false;
      console.log(`[customer] No more data, completed. Total customers: ${allCustomers.length}`);
    }
  }

  return allCustomers;
}

/**
 * 同步指定接粉号的客户列表（获取详细信息）
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

    // 从API批量获取客户详情（支持递归分页）
    console.log(`[customer] Step 4: Fetching customer details from API`);
    const customerDetails = await fetchAllCustomerDetails(accessToken, [wxUserId]);
    console.log(`[customer] customerDetails: ${customerDetails ? `array with ${customerDetails.length} items` : 'null'}`);
    if (!customerDetails || customerDetails.length === 0) {
      console.log(`[customer] customerDetails is empty, returning error`);
      return {
        success: false,
        added: 0,
        total: 0,
        message: "获取客户详情失败",
      };
    }

    console.log(`[customer] Step 5: Processing ${customerDetails.length} customer details`);

    // 先查询所有已存在的客户
    const externalUseridList = customerDetails.map(d => d.externalContact.external_userid);
    const existingCustomers = await Customer.find({
      userid: uid,
      corpid: corpId,
      wxUserId,
      externalUserid: { $in: externalUseridList },
    }).select('externalUserid');

    const existingExternalUserids = new Set(existingCustomers.map(c => c.externalUserid));

    // 处理客户数据，准备插入或更新
    const bulkOps: any[] = [];
    let newCount = 0;
    let updateCount = 0;

    for (const detail of customerDetails) {
      const externalContact = detail.externalContact;
      const followInfo = detail.followInfo;

      const externalUserid = externalContact.external_userid;

      const customerData = {
        userid: uid,
        corpid: corpId,
        wxUserId,
        externalUserid,

        // 客户基本信息
        name: externalContact.name,
        position: externalContact.position,
        avatar: externalContact.avatar,
        corpName: externalContact.corp_name,
        corpFullName: externalContact.corp_full_name,
        type: externalContact.type,
        gender: externalContact.gender,
        unionid: externalContact.unionid,
        externalProfile: externalContact.external_profile,

        // 跟进信息
        remark: followInfo.remark,
        description: followInfo.description,
        createtime: followInfo.createtime,
        tagId: followInfo.tag_id,
        remarkCorpName: followInfo.remark_corp_name,
        remarkMobiles: followInfo.remark_mobiles,
        operUserid: followInfo.oper_userid,
        addWay: followInfo.add_way,
        state: followInfo.state,
        wechatChannels: followInfo.wechat_channels,
      };

      if (!existingExternalUserids.has(externalUserid)) {
        // 新增客户
        bulkOps.push({
          insertOne: {
            document: customerData,
          },
        });
        newCount++;
      } else {
        // 更新现有客户
        bulkOps.push({
          updateOne: {
            filter: {
              userid: uid,
              corpid: corpId,
              wxUserId,
              externalUserid,
            },
            update: { $set: customerData },
          },
        });
        updateCount++;
      }
    }

    // 执行批量操作
    if (bulkOps.length > 0) {
      console.log(`[customer] Step 6: Executing bulk operations (${newCount} inserts, ${updateCount} updates)`);
      await Customer.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(`[customer] Step 7: Sync completed`);
    console.log(`[customer] ===== syncCustomerListByWxUserId END - SUCCESS =====`);
    console.log(`[customer] Sync completed for user ${uid}, wxUserId ${wxUserId}: ${newCount} new, ${updateCount} updated, total ${customerDetails.length}`);

    return {
      success: true,
      added: newCount,
      total: customerDetails.length,
      message: `同步成功，新增 ${newCount} 个客户，更新 ${updateCount} 个客户`,
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
 * 同步所有接粉号的客户列表
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
 * 获取客户列表（包含详细信息）
 * @param uid 用户ID
 * @param page 页码，默认1
 * @param pageSize 每页数量，默认20
 * @returns 客户列表（带分页和详细信息）
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

        // 客户基本信息
        name: customer.name,
        position: customer.position,
        avatar: customer.avatar,
        corpName: customer.corpName,
        corpFullName: customer.corpFullName,
        type: customer.type,
        gender: customer.gender,
        unionid: customer.unionid,

        // 跟进信息
        remark: customer.remark,
        description: customer.description,
        createtime: customer.createtime,
        tagId: customer.tagId,
        remarkCorpName: customer.remarkCorpName,
        remarkMobiles: customer.remarkMobiles,
        operUserid: customer.operUserid,
        addWay: customer.addWay,
        state: customer.state,

        // 视频号信息
        wechatChannels: customer.wechatChannels,

        // 时间戳
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
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

/**
 * 导出客户的unionid到txt文件
 * @param uid 用户ID
 * @returns 包含下载链接和文件名的对象
 */
export async function exportUnionids(uid: string): Promise<{
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  count?: number;
  message: string;
}> {
  console.log(`[customer] ===== exportUnionids START =====`);
  console.log(`[customer] uid: ${uid}`);
  try {
    // 获取用户的企业微信配置
    const corpIdSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_CORPID });
    if (!corpIdSetting || !corpIdSetting.value) {
      return {
        success: false,
        message: "未配置企业微信CorpID",
      };
    }

    const corpId = corpIdSetting.value.corpid as string;
    if (!corpId) {
      return {
        success: false,
        message: "企业微信CorpID格式错误",
      };
    }

    // 获取企业微信应用备注
    const remarkSetting = await Setting.findOne({ userid: uid, key: Settings.WECHAT_WORK_REMARK });
    const appRemark = remarkSetting?.value?.remark || "企业微信";

    // 查询所有客户的unionid
    const customers = await Customer.find({ userid: uid, corpid: corpId }).select('unionid');

    // 过滤有unionid的客户
    const unionids = customers
      .map(c => c.unionid)
      .filter((u): u is string => !!u); // 类型守卫，过滤掉null/undefined

    if (unionids.length === 0) {
      return {
        success: false,
        message: "没有找到有效的unionid数据",
      };
    }

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 生成文件名：应用备注 + 数量 + .txt
    const fileName = `${appRemark}_${unionids.length}.txt`;
    const filePath = path.join(exportDir, fileName);

    // 写入文件（一行一个unionid）
    const fileContent = unionids.join('\n');
    fs.writeFileSync(filePath, fileContent, { encoding: 'utf-8' });

    // 生成下载链接
    const downloadUrl = `/api/download/${fileName}`;

    console.log(`[customer] Exported ${unionids.length} unionids to ${filePath}`);
    console.log(`[customer] Download URL: ${downloadUrl}`);

    return {
      success: true,
      downloadUrl,
      fileName,
      count: unionids.length,
      message: `成功导出 ${unionids.length} 个unionid`,
    };
  } catch (error) {
    console.error(`[customer] ===== exportUnionids END - ERROR =====`);
    console.error(`[customer] Failed to export unionids for user ${uid}:`, error);
    return {
      success: false,
      message: `导出失败: ${error}`,
    };
  }
}
