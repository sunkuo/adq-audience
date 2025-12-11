/**
 * 飞书通知服务
 * 使用富文本（post）形式发送系统通知
 * 支持三种类型：信息(info)、失败(error)、警告(warning)
 */

export type FeishuMessageType = "info" | "error" | "warning";

export interface SendFeishuNotificationInput {
  webhookUrl: string;
  type: FeishuMessageType;
  title: string;
  content: string;
}

export interface FeishuNotificationResult {
  success: boolean;
  body: Record<string, any>;
}

// 标题前缀和颜色标识
const MESSAGE_CONFIG: Record<
  FeishuMessageType,
  { prefix: string; label: string }
> = {
  info: { prefix: "📢", label: "信息" },
  error: { prefix: "❌", label: "失败" },
  warning: { prefix: "⚠️", label: "警告" },
};

/**
 * 构建飞书富文本消息体
 */
function buildPostMessage(
  type: FeishuMessageType,
  title: string,
  content: string
) {
  const config = MESSAGE_CONFIG[type];
  const timestamp = new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });

  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: `${config.prefix} ${title}`,
          content: [
            // 类型标签
            [
              {
                tag: "text",
                text: `【${config.label}】`,
              },
            ],
            // 消息内容
            [
              {
                tag: "text",
                text: content,
              },
            ],
            // 分隔线
            [
              {
                tag: "text",
                text: "─".repeat(20),
              },
            ],
            // 时间戳
            [
              {
                tag: "text",
                text: `⏰ ${timestamp}`,
              },
            ],
          ],
        },
      },
    },
  };
}

/**
 * 发送飞书富文本通知
 */
export async function sendFeishuNotification(
  input: SendFeishuNotificationInput
): Promise<FeishuNotificationResult> {
  const { webhookUrl, type, title, content } = input;

  if (!webhookUrl) {
    return {
      success: false,
      body: { error: "Webhook URL is required" },
    };
  }

  try {
    const message = buildPostMessage(type, title, content);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseBody = await response.json();

    // 飞书返回 code 为 0 表示成功
    const success = responseBody.code === 0 || responseBody.StatusCode === 0;

    return {
      success,
      body: responseBody,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      body: { error: errorMessage },
    };
  }
}

/**
 * 发送信息类型通知
 */
export async function sendInfoNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<FeishuNotificationResult> {
  return sendFeishuNotification({ webhookUrl, type: "info", title, content });
}

/**
 * 发送错误类型通知
 */
export async function sendErrorNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<FeishuNotificationResult> {
  return sendFeishuNotification({ webhookUrl, type: "error", title, content });
}

/**
 * 发送警告类型通知
 */
export async function sendWarningNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<FeishuNotificationResult> {
  return sendFeishuNotification({ webhookUrl, type: "warning", title, content });
}
