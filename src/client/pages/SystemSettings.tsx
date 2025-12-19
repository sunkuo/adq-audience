/**
 * 系统设置页面
 * 包含通知设置：系统内通知、飞书通知配置、企微私有应用配置
 */

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  App,
  Typography,
  Space,
  Row,
  Col,
  Switch,
  Spin,
  Divider,
  Alert,
  Tabs,
} from "antd";
import {
  BellOutlined,
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  WechatOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Title, Text, Paragraph } = Typography;

interface NotificationSettings {
  systemNotificationEnabled: boolean;
  feishuNotificationEnabled: boolean;
  feishuWebhookUrl: string;
}

interface WxWorkSettings {
  wechatWorkCorpid: string;
  wechatWorkCorpsecret: string;
  wechatWorkRemark: string;
}

export function SystemSettings() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [savingNotification, setSavingNotification] = useState(false);
  const [savingWxWork, setSavingWxWork] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [wxWorkTesting, setWxWorkTesting] = useState(false);
  const [wxWorkTestResult, setWxWorkTestResult] = useState<{
    success: boolean;
    message: string;
    token?: string;
  } | null>(null);

  const [notificationForm] = Form.useForm();
  const [wxWorkForm] = Form.useForm();

  // 监听飞书通知开关状态
  const feishuEnabled = Form.useWatch("feishuNotificationEnabled", notificationForm);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await trpc.setting.getNotificationSettings.query();

        // 分离设置到不同的表单
        notificationForm.setFieldsValue({
          systemNotificationEnabled: settings.systemNotificationEnabled,
          feishuNotificationEnabled: settings.feishuNotificationEnabled,
          feishuWebhookUrl: settings.feishuWebhookUrl,
        });

        wxWorkForm.setFieldsValue({
          wechatWorkCorpid: settings.wechatWorkCorpid,
          wechatWorkCorpsecret: settings.wechatWorkCorpsecret,
          wechatWorkRemark: settings.wechatWorkRemark,
        });
      } catch (err) {
        message.error("加载设置失败");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [notificationForm, wxWorkForm, message]);

  // 保存通知设置
  const handleSaveNotification = async (values: NotificationSettings) => {
    setSavingNotification(true);
    try {
      await trpc.setting.updateNotificationSettings.mutate({
        systemNotificationEnabled: values.systemNotificationEnabled,
        feishuNotificationEnabled: values.feishuNotificationEnabled,
        feishuWebhookUrl: values.feishuWebhookUrl || "",
      });
      message.success("通知设置保存成功！");
    } catch (err: any) {
      message.error(err?.message || "保存失败，请重试");
    } finally {
      setSavingNotification(false);
    }
  };

  // 保存企业微信设置
  const handleSaveWxWork = async (values: WxWorkSettings) => {
    setSavingWxWork(true);
    try {
      await trpc.setting.updateWxWorkSettings.mutate({
        wechatWorkCorpid: values.wechatWorkCorpid || "",
        wechatWorkCorpsecret: values.wechatWorkCorpsecret || "",
        wechatWorkRemark: values.wechatWorkRemark || "",
      });
      message.success("企业微信设置保存成功！");
    } catch (err: any) {
      message.error(err?.message || "保存失败，请重试");
    } finally {
      setSavingWxWork(false);
    }
  };

  // 测试飞书通知
  const handleTestFeishu = async () => {
    const webhookUrl = notificationForm.getFieldValue("feishuWebhookUrl");
    if (!webhookUrl) {
      message.warning("请先输入飞书 Webhook URL");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const result = await trpc.setting.testFeishuNotification.mutate({
        webhookUrl,
      });
      setTestResult({
        success: result.success,
        message: result.success
          ? "测试消息发送成功！请检查飞书群是否收到消息。"
          : `发送失败: ${result.body?.msg || result.body?.error || "未知错误"}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "测试失败，请检查 Webhook URL 是否正确",
      });
    } finally {
      setTesting(false);
    }
  };

  // 测试企业微信配置
  const handleTestWxWork = async () => {
    setWxWorkTesting(true);
    setWxWorkTestResult(null);
    try {
      const result = await trpc.setting.testWxWorkConfig.mutate();
      setWxWorkTestResult(result);
      if (result.success) {
        message.success("企业微信配置验证成功！");
      } else {
        message.warning(result.message);
      }
    } catch (err: any) {
      setWxWorkTestResult({
        success: false,
        message: err?.message || "测试失败，请检查配置",
      });
      message.error("测试失败");
    } finally {
      setWxWorkTesting(false);
    }
  };

  // 手动刷新企业微信token
  const handleRefreshWxWorkToken = async () => {
    setWxWorkTesting(true);
    try {
      const result = await trpc.setting.refreshWxWorkToken.mutate();
      if (result.success) {
        message.success("access_token刷新成功！");
      } else {
        message.warning(result.message);
      }
    } catch (err: any) {
      message.error(err?.message || "刷新失败");
    } finally {
      setWxWorkTesting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Tab内容：通知设置
  const notificationTab = (
    <Form
      form={notificationForm}
      layout="vertical"
      onFinish={handleSaveNotification}
      initialValues={{
        systemNotificationEnabled: true,
        feishuNotificationEnabled: false,
        feishuWebhookUrl: "",
      }}
    >
      {/* 系统内通知 */}
      <Card
        size="small"
        style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
        bordered={false}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={0}>
              <Text strong>系统内通知</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                在系统内的通知中心显示消息
              </Text>
            </Space>
          </Col>
          <Col>
            <Form.Item
              name="systemNotificationEnabled"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 飞书通知 */}
      <Card
        size="small"
        style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
        bordered={false}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={0}>
              <Text strong>飞书通知</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                通过飞书群机器人推送消息
              </Text>
            </Space>
          </Col>
          <Col>
            <Form.Item
              name="feishuNotificationEnabled"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        {/* 飞书配置区域 */}
        {feishuEnabled && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: "16px 0" }} />
            <Form.Item
              name="feishuWebhookUrl"
              label="Webhook URL"
              rules={[
                {
                  required: feishuEnabled,
                  message: "请输入飞书 Webhook URL",
                },
                {
                  type: "url",
                  message: "请输入有效的 URL 地址",
                },
              ]}
              extra="在飞书群设置中添加自定义机器人获取 Webhook 地址"
            >
              <Input
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                size="large"
                allowClear
              />
            </Form.Item>

            <Space>
              <Button
                icon={<SendOutlined />}
                onClick={handleTestFeishu}
                loading={testing}
                disabled={!notificationForm.getFieldValue("feishuWebhookUrl")}
              >
                发送测试消息
              </Button>
            </Space>

            {testResult && (
              <Alert
                style={{ marginTop: 12 }}
                type={testResult.success ? "success" : "error"}
                message={testResult.message}
                icon={
                  testResult.success ? (
                    <CheckCircleOutlined />
                  ) : (
                    <CloseCircleOutlined />
                  )
                }
                showIcon
                closable
                onClose={() => setTestResult(null)}
              />
            )}
          </div>
        )}
      </Card>

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={savingNotification}
          size="large"
          icon={<SaveOutlined />}
        >
          保存通知设置
        </Button>
      </Form.Item>
    </Form>
  );

  // Tab内容：企业微信私有应用
  const wxWorkTab = (
    <Form
      form={wxWorkForm}
      layout="vertical"
      onFinish={handleSaveWxWork}
      initialValues={{
        wechatWorkCorpid: "",
        wechatWorkCorpsecret: "",
        wechatWorkRemark: "",
      }}
    >
      <Card
        size="small"
        style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
        bordered={false}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          配置企业微信私有应用，用于推送消息到企业微信。配置完成后可进行连接测试。
        </Text>

        <Form.Item
          name="wechatWorkCorpid"
          label="CorpID"
          rules={[
            {
              required: false,
              message: "请输入企业微信 CorpID",
            },
          ]}
          extra="企业微信应用的 CorpID，在企业微信管理后台查看"
        >
          <Input
            placeholder="wwxxxxxx"
            size="large"
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="wechatWorkCorpsecret"
          label="CorpSecret"
          rules={[
            {
              required: false,
              message: "请输入企业微信 CorpSecret",
            },
          ]}
          extra="企业微信应用的 Secret"
        >
          <Input.Password
            placeholder="请输入应用的 Secret"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="wechatWorkRemark"
          label="备注"
          extra="用于标识该配置的用途说明"
        >
          <Input
            placeholder="例如：OA系统通知"
            size="large"
            allowClear
          />
        </Form.Item>

        <Divider style={{ margin: "16px 0" }} />

        <Space>
          <Button
            type="dashed"
            onClick={handleTestWxWork}
            loading={wxWorkTesting}
            icon={<CheckCircleOutlined />}
          >
            测试配置连接
          </Button>
          <Button
            onClick={handleRefreshWxWorkToken}
            loading={wxWorkTesting}
          >
            手动刷新Token
          </Button>
        </Space>

        {wxWorkTestResult && (
          <Alert
            style={{ marginTop: 12 }}
            type={wxWorkTestResult.success ? "success" : "warning"}
            message={wxWorkTestResult.message}
            description={wxWorkTestResult.token ? `Token: ${wxWorkTestResult.token}` : undefined}
            showIcon
            closable
            onClose={() => setWxWorkTestResult(null)}
          />
        )}
      </Card>

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={savingWxWork}
          size="large"
          icon={<SaveOutlined />}
        >
          保存企业微信设置
        </Button>
      </Form.Item>
    </Form>
  );

  // Tab配置
  const tabItems = [
    {
      key: "notification",
      label: (
        <Space>
          <BellOutlined style={{ color: "#6366f1" }} />
          <span>通知设置</span>
        </Space>
      ),
      children: notificationTab,
    },
    {
      key: "wxwork",
      label: (
        <Space>
          <WechatOutlined style={{ color: "#07C160" }} />
          <span>企业微信应用</span>
        </Space>
      ),
      children: wxWorkTab,
    },
  ];

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <SettingOutlined style={{ color: "#6366f1" }} />
                <span>系统设置</span>
              </Space>
            }
          >
            <Tabs defaultActiveKey="notification" items={tabItems} />
          </Card>
        </Col>

        {/* 帮助说明 */}
        <Col xs={24} lg={8}>
          <Card bordered={false} className="shadow-sm">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  设置说明
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                  根据需求配置不同的功能模块：
                </Paragraph>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>🔔 通知设置</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  配置系统内通知和飞书群通知，用于消息推送和提醒。
                </Paragraph>
              </div>

              <div>
                <Text strong>💬 企业微信应用</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  配置企业微信私有应用，用于企业内部消息推送。access_token会自动管理。
                </Paragraph>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>如何获取飞书 Webhook？</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  1. 打开飞书群聊设置
                  <br />
                  2. 选择「群机器人」
                  <br />
                  3. 添加「自定义机器人」
                  <br />
                  4. 复制 Webhook 地址
                </Paragraph>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>如何配置企业微信应用？</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  1. 登录企业微信管理后台
                  <br />
                  2. 进入「应用管理」→「应用」
                  <br />
                  3. 创建或选择自建应用
                  <br />
                  4. 获取 CorpID 和 Secret
                  <br />
                  5. 配置可信域名/IP
                </Paragraph>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>⚠️ 安全提示</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  access_token会自动缓存到Redis，每小时自动刷新。请勿将凭证返回给前端。
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
