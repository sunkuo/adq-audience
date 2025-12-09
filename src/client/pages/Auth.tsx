/**
 * 登录/注册页面
 * 现代化、扁平化设计
 */

import { useState } from "react";
import { Form, Input, Button, Card, Tabs, message, Typography, App } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { signIn, signUp } from "../lib/auth-client";

const { Title, Text } = Typography;

interface AuthFormValues {
  username: string;
  password: string;
  email?: string;
}

export function AuthPage() {
  const [loading, setLoading] = useState(false);
  const { message: globalMessage } = App.useApp();

  // 登录处理
  const handleLogin = async (values: AuthFormValues) => {
    setLoading(true);
    try {
      const { error } = await signIn.username({
        username: values.username,
        password: values.password,
      });

      if (error) {
        globalMessage.error(error.message || "登录失败");
      } else {
        globalMessage.success("欢迎回来！");
      }
    } catch (err) {
      globalMessage.error("登录时发生错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const handleRegister = async (values: AuthFormValues) => {
    setLoading(true);
    try {
      const { error } = await signUp.email({
        username: values.username,
        email: `${values.username}@local.dev`, // 自动生成本地邮箱，简化演示
        password: values.password,
        name: values.username,
      });

      if (error) {
        globalMessage.error(error.message || "注册失败");
      } else {
        globalMessage.success("注册成功！已为您自动登录");
      }
    } catch (err) {
      globalMessage.error("注册时发生错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 通用表单项
  const formItems = (
    <>
      <Form.Item
        name="username"
        rules={[
          { required: true, message: "请输入用户名" },
          { min: 3, message: "用户名至少 3 个字符" },
          { pattern: /^[a-zA-Z0-9_]+$/, message: "用户名只能包含字母、数字和下划线" },
        ]}
      >
        <Input 
          prefix={<UserOutlined className="text-gray-400" />} 
          placeholder="用户名" 
          size="large" 
          variant="filled" // 使用 Antd 5 的 filled 变体
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: "请输入密码" },
          { min: 6, message: "密码至少 6 个字符" },
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined className="text-gray-400" />} 
          placeholder="密码" 
          size="large" 
          variant="filled"
        />
      </Form.Item>
    </>
  );

  // Tabs 配置
  const items = [
    {
      key: "login",
      label: "登录",
      children: (
        <div className="fade-in pt-4">
          <Form onFinish={handleLogin} autoComplete="off" layout="vertical" requiredMark={false}>
            {formItems}
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" className="shadow-md">
                立即登录
              </Button>
            </Form.Item>
            <div style={{ textAlign: "center" }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                忘记密码？ <a style={{ color: "#6366f1" }}>找回密码</a>
              </Text>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: "register",
      label: "注册",
      children: (
        <div className="fade-in pt-4">
          <Form onFinish={handleRegister} autoComplete="off" layout="vertical" requiredMark={false}>
            {formItems}
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" className="shadow-md">
                创建账户
              </Button>
            </Form.Item>
            <div style={{ textAlign: "center" }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                注册即代表同意 <a style={{ color: "#6366f1" }}>服务条款</a> 和 <a style={{ color: "#6366f1" }}>隐私政策</a>
              </Text>
            </div>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-gradient">
      <Card 
        className="glass-effect shadow-2xl" 
        style={{ width: 420, padding: "12px 12px 0" }}
        bordered={false}
      >
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 12 }}>
          <div 
            style={{ 
              width: 48, 
              height: 48, 
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              borderRadius: 12,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 24,
              fontWeight: "bold",
              boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)"
            }}
          >
            A
          </div>
          <Title level={3} style={{ margin: "0 0 8px", fontWeight: 700, color: "#1e293b" }}>
            Admin Plus
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            新一代全栈后台管理系统
          </Text>
        </div>

        <Tabs 
          items={items} 
          centered 
          size="large"
          indicator={{ size: (origin) => origin - 20, align: "center" }}
        />
      </Card>
    </div>
  );
}
