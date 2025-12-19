/**
 * 系统设置页面
 * 包含通知设置：系统内通知、飞书通知配置、企业微信通知配置
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
  wechatWorkCorpid: string;
  wechatWorkCorpsecret: string;
  wechatWorkRemark: string;
}

export function SystemSettings() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [form] = Form.useForm();

  // 监听飞书通知开关状态
  const feishuEnabled = Form.useWatch("feishuNotificationEnabled", form);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await trpc.setting.getNotificationSettings.query();
        form.setFieldsValue(settings);
      } catch (err) {
        message.error("加载设置失败");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [form, message]);

  // 保存设置
  const handleSave = async (values: NotificationSettings) => {
    setSaving(true);
    try {
      await trpc.setting.updateAllNotificationSettings.mutate({
        systemNotificationEnabled: values.systemNotificationEnabled,
        feishuNotificationEnabled: values.feishuNotificationEnabled,
        feishuWebhookUrl: values.feishuWebhookUrl || "",
        wechatWorkCorpid: values.wechatWorkCorpid || "",
        wechatWorkCorpsecret: values.wechatWorkCorpsecret || "",
        wechatWorkRemark: values.wechatWorkRemark || "",
      });
      message.success("设置保存成功！");
    } catch (err: any) {
      message.error(err?.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // 测试飞书通知
  const handleTestFeishu = async () => {
    const webhookUrl = form.getFieldValue("feishuWebhookUrl");
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

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        {/* 通知设置 */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <BellOutlined style={{ color: "#6366f1" }} />
                <span>通知设置</span>
              </Space>
            }
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              配置系统通知的推送方式，支持系统内通知、飞书群通知和企业微信应用通知。
            </Text>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                systemNotificationEnabled: true,
                feishuNotificationEnabled: false,
                feishuWebhookUrl: "",
                wechatWorkCorpid: "",
                wechatWorkCorpsecret: "",
                wechatWorkRemark: "",
              }}
            >
              {/* 系统内通知 */}
              <Card
                size="small"
                style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
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

                    <Button
                      icon={<SendOutlined />}
                      onClick={handleTestFeishu}
                      loading={testing}
                      disabled={!form.getFieldValue("feishuWebhookUrl")}
                    >
                      发送测试消息
                    </Button>

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

              {/* 企业微信通知 */}
              <Card
                size="small"
                style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <Space direction="vertical" size={0}>
                      <Text strong>企业微信通知</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        通过企业微信应用推送消息
                      </Text>
                    </Space>
                  </Col>
                </Row>

                {/* 企业微信配置区域 */}
                <div style={{ marginTop: 16 }}>
                  <Divider style={{ margin: "16px 0" }} />
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
                </div>
              </Card>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  size="large"
                  icon={<SaveOutlined />}
                >
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 帮助说明 */}
        <Col xs={24} lg={8}>
          <Card bordered={false} className="shadow-sm">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  通知说明
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                  系统支持多种通知方式，您可以根据需要开启或关闭：
                </Paragraph>
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>📬 系统内通知</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  通知会显示在系统右上角的通知中心，适合日常查看重要消息。
                </Paragraph>
              </div>

              <div>
                <Text strong>🔔 飞书通知</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  通过飞书群机器人实时推送，适合需要即时提醒的场景。
                </Paragraph>
              </div>

              <div>
                <Text strong>💬 企业微信通知</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 13, marginTop: 4, marginBottom: 0 }}
                >
                  通过企业微信应用推送消息，适合企业内部通知场景。
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
                  4. 获取 AgentID、CorpID 和 Secret
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
