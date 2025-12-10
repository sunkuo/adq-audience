/**
 * 安全中心页面
 * 用户可以修改密码等安全相关操作
 */

import { useState } from "react";
import { Card, Form, Input, Button, App, Typography, Space, Divider, Row, Col } from "antd";
import { LockOutlined, SafetyOutlined, KeyOutlined } from "@ant-design/icons";
import { authClient } from "../lib/auth-client";

const { Title, Text } = Typography;

export function SecurityCenter() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 修改密码
  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true, // 修改密码后注销其他设备的登录
      });

      if (error) {
        message.error(error.message || "修改密码失败");
        return;
      }

      message.success("密码修改成功！");
      form.resetFields();
    } catch (err) {
      message.error("修改密码时发生错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        {/* 修改密码 */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <KeyOutlined style={{ color: "#6366f1" }} />
                <span>修改密码</span>
              </Space>
            }
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              定期修改密码可以提高账户安全性。修改密码后，其他设备将自动退出登录。
            </Text>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleChangePassword}
              requiredMark={false}
            >
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[{ required: true, message: "请输入当前密码" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入当前密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: "请输入新密码" },
                  { min: 6, message: "密码至少6位" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入新密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "请确认新密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次输入的密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请再次输入新密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  icon={<SafetyOutlined />}
                >
                  确认修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 安全提示 */}
        <Col xs={24} lg={12}>
          <Card bordered={false} className="shadow-sm">
            <Title level={5} style={{ marginBottom: 16 }}>
              <SafetyOutlined style={{ marginRight: 8, color: "#10b981" }} />
              安全建议
            </Title>
            <Divider style={{ margin: "16px 0" }} />
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Text strong>使用强密码</Text>
                <br />
                <Text type="secondary">
                  密码应包含大小写字母、数字和特殊字符，长度至少8位
                </Text>
              </div>
              <div>
                <Text strong>定期更换密码</Text>
                <br />
                <Text type="secondary">
                  建议每3个月更换一次密码，避免使用相同密码
                </Text>
              </div>
              <div>
                <Text strong>不要共享密码</Text>
                <br />
                <Text type="secondary">
                  切勿将密码告知他人或在不安全的地方记录密码
                </Text>
              </div>
              <div>
                <Text strong>注意登录环境</Text>
                <br />
                <Text type="secondary">
                  避免在公共设备上登录，使用完毕后及时退出
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
