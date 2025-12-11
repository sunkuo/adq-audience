/**
 * 个人资料设置页面
 * 用户可以编辑昵称和头像
 */

import { useState, useEffect } from "react";
import { Card, Form, Input, Button, App, Typography, Space, Row, Col, Avatar, Spin, Divider } from "antd";
import { UserOutlined, EditOutlined, SaveOutlined, CameraOutlined, IdcardOutlined } from "@ant-design/icons";
import { useSession } from "../lib/auth-client";
import { trpc } from "../trpc";

const { Title, Text } = Typography;

interface ProfileData {
  nickname: string;
  avatar: string;
}

export function ProfileSettings() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // 加载个人资料
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await trpc.profile.get.query();
        form.setFieldsValue({
          nickname: profile.nickname,
          avatar: profile.avatar,
        });
        setAvatarPreview(profile.avatar);
      } catch (err) {
        message.error("加载个人资料失败");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [form, message]);

  // 保存资料
  const handleSave = async (values: ProfileData) => {
    setSaving(true);
    try {
      const result = await trpc.profile.update.mutate({
        nickname: values.nickname,
        avatar: values.avatar || "",
      });
      setAvatarPreview(result.avatar);
      message.success("个人资料保存成功！");
    } catch (err: any) {
      message.error(err?.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // 头像URL变化时更新预览
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAvatarPreview(url);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        {/* 头像预览卡片 */}
        <Col xs={24} lg={8}>
          <Card bordered={false} className="shadow-sm">
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Avatar
                size={120}
                src={avatarPreview || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: avatarPreview ? "transparent" : "#6366f1",
                  border: "4px solid #f1f5f9",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
                {form.getFieldValue("nickname") || session?.user?.name || "用户"}
              </Title>
              <Text type="secondary">{session?.user?.email}</Text>
              
              <Divider style={{ margin: "24px 0 16px" }} />
              
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px" }}>
                  <Text type="secondary">用户ID</Text>
                  <Text copyable={{ text: session?.user?.id }} style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {session?.user?.id?.slice(0, 8)}...
                  </Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px" }}>
                  <Text type="secondary">账户类型</Text>
                  <Text>{session?.user?.role === "admin" ? "管理员" : "普通用户"}</Text>
                </div>
              </Space>
            </div>
          </Card>
        </Col>

        {/* 编辑表单 */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <IdcardOutlined style={{ color: "#6366f1" }} />
                <span>编辑个人资料</span>
              </Space>
            }
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              更新您的个人信息，这些信息将显示在您的个人主页上。
            </Text>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              requiredMark={false}
            >
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[
                  { required: true, message: "请输入昵称" },
                  { max: 50, message: "昵称最多50个字符" },
                ]}
              >
                <Input
                  prefix={<EditOutlined />}
                  placeholder="请输入您的昵称"
                  size="large"
                  maxLength={50}
                  showCount
                />
              </Form.Item>

              <Form.Item
                name="avatar"
                label="头像URL"
                rules={[
                  {
                    type: "url",
                    message: "请输入有效的URL地址",
                    warningOnly: true,
                  },
                ]}
                extra="输入图片的URL地址，支持 jpg、png、gif 等格式"
              >
                <Input
                  prefix={<CameraOutlined />}
                  placeholder="https://example.com/avatar.jpg"
                  size="large"
                  onChange={handleAvatarChange}
                  allowClear
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  size="large"
                  icon={<SaveOutlined />}
                >
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
