# 企业微信access_token管理服务

## 功能概述

本服务封装了企业微信access_token的管理，使用Redis进行缓存，并提供定时刷新机制。企业微信应用配置已从通知设置中分离，作为独立的功能模块。

## 文件结构

```
src/
├── client/
│   └── pages/
│       └── SystemSettings.tsx    # 系统设置页面（分Tab：通知设置 + 企业微信应用）
├── server/
│   ├── service/
│   │   ├── wxwork.ts             # 核心服务文件
│   │   └── wxwork.md             # 本文档
│   ├── bullmq/
│   │   └── schedules/
│   │       └── wxwork.ts         # 定时任务（每小时刷新）
│   └── routers/
│       └── setting.ts            # API接口（分离为独立方法）
```

## 前端界面架构

### 系统设置页面（SystemSettings.tsx）
使用Ant Design Tabs组件分离为两个独立Tab：

#### Tab 1: 通知设置
- 系统内通知开关
- 飞书通知配置（Webhook URL）
- 飞书测试消息发送

#### Tab 2: 企业微信应用
- CorpID、CorpSecret、备注配置
- 测试配置连接（获取access_token）
- 手动刷新access_token
- 显示token状态

## 后端API接口

### 通知设置相关
```typescript
// 获取通知设置（包含所有配置）
settingRouter.getNotificationSettings.query()

// 更新通知设置（仅通知相关）
settingRouter.updateNotificationSettings.mutate({
  systemNotificationEnabled: boolean,
  feishuNotificationEnabled: boolean,
  feishuWebhookUrl: string
})
```

### 企业微信应用相关
```typescript
// 更新企业微信设置
settingRouter.updateWxWorkSettings.mutate({
  wechatWorkCorpid: string,
  wechatWorkCorpsecret: string,
  wechatWorkRemark: string
})

// 测试企业微信配置
settingRouter.testWxWorkConfig.mutation()
// 返回：{ success, message, token }

// 手动刷新access_token
settingRouter.refreshWxWorkToken.mutation()
// 返回：{ success, message }
```

## 核心函数

### Token管理

```typescript
// 从Redis获取access_token
getToken(uid: string, corpId: string): Promise<string | null>

// 将access_token保存到Redis
setToken(uid: string, corpId: string, token: string, expiresIn?: number): Promise<boolean>

// 从Redis删除access_token
deleteToken(uid: string, corpId: string): Promise<boolean>
```

### Token刷新

```typescript
// 刷新指定用户的access_token
refreshUserToken(uid: string): Promise<boolean>

// 刷新所有用户的access_token
refreshAllUserTokens(): Promise<{ success: number; failed: number; total: number }>

// 获取或刷新access_token（优先从Redis获取）
getOrRefreshToken(uid: string): Promise<string | null>
```

## Redis Key格式

```
wxwork:token:{uid}:{corpId}
```

例如：`wxwork:token:user123:ww123456`

## 定时任务

- **任务名称**: wxwork-token-refresh
- **执行频率**: 每小时一次（cron: `0 * * * *`）
- **功能**: 自动刷新所有配置了企业微信的用户的access_token
- **日志**: `[wxwork-schedule]`

## 使用示例

### 在代码中使用

```typescript
import { getOrRefreshToken, refreshUserToken } from "../service/wxwork";

// 获取用户的access_token
const token = await getOrRefreshToken("user123");

// 手动刷新某个用户的token
await refreshUserToken("user123");
```

### 在前端使用

```typescript
// 测试企业微信配置
const result = await trpc.setting.testWxWorkConfig.mutate();

// 手动刷新token
const result = await trpc.setting.refreshWxWorkToken.mutate();

// 保存企业微信设置
await trpc.setting.updateWxWorkSettings.mutate({
  wechatWorkCorpid: "ww123456",
  wechatWorkCorpsecret: "your_secret",
  wechatWorkRemark: "OA系统"
});
```

## 配置要求

用户需要在企业微信应用Tab中配置以下参数：

- `WECHAT_WORK_CORPID`: 企业微信CorpID（格式：wwxxxxxx）
- `WECHAT_WORK_CORPSECRET`: 企业微信应用Secret
- `WECHAT_WORK_REMARK`: 配置备注（可选）

## 安全说明

- access_token **不会** 返回给前端，只在后端使用
- 测试接口只返回token的前20位用于验证
- Redis中的token会自动设置过期时间（比API返回的有效期少10秒）
- 定时任务会提前刷新token，避免过期
- 凭证存储在MongoDB，token缓存在Redis

## 日志格式

所有操作都会输出带前缀的日志：
- `[wxwork]` - 通用服务日志
- `[wxwork-schedule]` - 定时任务日志

## 错误处理

- 所有函数都有错误捕获和日志记录
- 失败时返回 `null` 或 `false`
- 不会抛出异常，确保系统稳定性
- 前端会显示友好的错误提示