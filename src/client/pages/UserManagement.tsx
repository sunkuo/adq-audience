/**
 * 用户管理页面
 * 管理员可以查看所有用户、创建用户、禁用/解禁用户、修改密码和角色
 */

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Popconfirm,
  App,
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
} from "antd";
import {
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  UserSwitchOutlined,
  ReloadOutlined,
  UserOutlined,
  SafetyOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { authClient } from "../lib/auth-client";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

// 用户类型定义
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  createdAt: string;
  updatedAt?: string;
}

// 列表响应类型
interface ListUsersResponse {
  users: User[];
  total: number;
}

export function UserManagement() {
  const { message, modal } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  
  // 弹窗状态
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (error) {
        message.error(error.message || "加载用户列表失败");
        return;
      }

      const response = data as ListUsersResponse;
      setUsers(response.users || []);
      setTotal(response.total || 0);
    } catch (err) {
      message.error("加载用户列表时发生错误");
    } finally {
      setLoading(false);
    }
  }, [pagination, message]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 创建用户
  const handleCreateUser = async (values: { username: string; name: string; email: string; password: string; role: "user" | "admin" }) => {
    try {
      const { error } = await authClient.admin.createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        data: {
          username: values.username, // username 插件需要这个字段
        },
      });

      if (error) {
        message.error(error.message || "创建用户失败");
        return;
      }

      message.success("用户创建成功");
      setCreateModalOpen(false);
      createForm.resetFields();
      loadUsers();
    } catch (err) {
      message.error("创建用户时发生错误");
    }
  };

  // 禁用用户
  const handleBanUser = async (user: User) => {
    try {
      const { error } = await authClient.admin.banUser({
        userId: user.id,
        banReason: "管理员操作",
      });

      if (error) {
        message.error(error.message || "禁用用户失败");
        return;
      }

      message.success(`已禁用用户 ${user.name}`);
      loadUsers();
    } catch (err) {
      message.error("禁用用户时发生错误");
    }
  };

  // 解禁用户
  const handleUnbanUser = async (user: User) => {
    try {
      const { error } = await authClient.admin.unbanUser({
        userId: user.id,
      });

      if (error) {
        message.error(error.message || "解禁用户失败");
        return;
      }

      message.success(`已解禁用户 ${user.name}`);
      loadUsers();
    } catch (err) {
      message.error("解禁用户时发生错误");
    }
  };

  // 修改密码
  const handleChangePassword = async (values: { newPassword: string }) => {
    if (!selectedUser) return;

    try {
      const { error } = await authClient.admin.setUserPassword({
        userId: selectedUser.id,
        newPassword: values.newPassword,
      });

      if (error) {
        message.error(error.message || "修改密码失败");
        return;
      }

      message.success(`已修改用户 ${selectedUser.name} 的密码`);
      setPasswordModalOpen(false);
      passwordForm.resetFields();
      setSelectedUser(null);
    } catch (err) {
      message.error("修改密码时发生错误");
    }
  };

  // 修改角色
  const handleChangeRole = async (values: { role: "user" | "admin" }) => {
    if (!selectedUser) return;

    try {
      const { error } = await authClient.admin.setRole({
        userId: selectedUser.id,
        role: values.role,
      });

      if (error) {
        message.error(error.message || "修改角色失败");
        return;
      }

      message.success(`已将用户 ${selectedUser.name} 的角色修改为 ${values.role}`);
      setRoleModalOpen(false);
      roleForm.resetFields();
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      message.error("修改角色时发生错误");
    }
  };

  // 删除用户
  const handleRemoveUser = async (user: User) => {
    try {
      const { error } = await authClient.admin.removeUser({
        userId: user.id,
      });

      if (error) {
        message.error(error.message || "删除用户失败");
        return;
      }

      message.success(`已删除用户 ${user.name}`);
      loadUsers();
    } catch (err) {
      message.error("删除用户时发生错误");
    }
  };

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      width: 140,
      fixed: "left",
      render: (username, record) => (
        <Space>
          <span style={{fontWeight: 500}}>{username || "-"}</span>
          {record.banned && (
            <Tooltip title={record.banReason || "已禁用"}>
              <Badge status="error" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "昵称",
      dataIndex: "name",
      key: "name",
      width: 120,
      render: (name) => <Text copyable={{ text: name }}>{name}</Text>,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (email) => <Text copyable={{ text: email }}>{email}</Text>,
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role) => (
        <Tag color={role === "admin" ? "gold" : "blue"}>
          {role === "admin" ? "管理员" : "用户"}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "banned",
      key: "banned",
      width: 80,
      render: (banned) => (
        <Tag color={banned ? "error" : "success"}>
          {banned ? "已禁用" : "正常"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="修改密码">
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setPasswordModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="修改角色">
            <Button
              type="text"
              size="small"
              icon={<UserSwitchOutlined />}
              onClick={() => {
                setSelectedUser(record);
                roleForm.setFieldsValue({ role: record.role || "user" });
                setRoleModalOpen(true);
              }}
            />
          </Tooltip>
          {record.banned ? (
            <Tooltip title="解禁">
              <Button
                type="text"
                size="small"
                icon={<UnlockOutlined />}
                style={{ color: "#52c41a" }}
                onClick={() => handleUnbanUser(record)}
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="禁用用户"
              description={`确定要禁用用户 "${record.name}" 吗？`}
              onConfirm={() => handleBanUser(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="禁用">
                <Button
                  type="text"
                  size="small"
                  icon={<LockOutlined />}
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="删除用户"
            description={`确定要永久删除用户 "${record.name}" 吗？此操作不可恢复！`}
            onConfirm={() => handleRemoveUser(record)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" size="small" icon={<StopOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const adminCount = users.filter((u) => u.role === "admin").length;
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <div className="fade-in">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="总用户数"
              value={total}
              prefix={<UserOutlined />}
              styles={{ content: { color: "#6366f1" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="管理员"
              value={adminCount}
              prefix={<SafetyOutlined />}
              styles={{ content: { color: "#f59e0b" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="已禁用"
              value={bannedCount}
              prefix={<LockOutlined />}
              styles={{ content: { color: "#ef4444" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <Card
        variant="borderless"
        className="shadow-sm"
        title={
          <Title level={5} style={{ margin: 0 }}>
            用户列表
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              创建用户
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1010 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 创建用户弹窗 */}
      <Modal
        title="创建用户"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{ role: "user" }}
        >
          <Form.Item
            name="username"
            label="登录账号"
            rules={[
              { required: true, message: "请输入登录账号" },
              { min: 3, message: "账号至少3个字符" },
              { pattern: /^[a-zA-Z0-9_]+$/, message: "只能包含字母、数字和下划线" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用于登录的账号" />
          </Form.Item>
          <Form.Item
            name="name"
            label="用户昵称"
            rules={[{ required: true, message: "请输入用户昵称" }]}
          >
            <Input placeholder="显示名称" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6位" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select>
              <Select.Option value="user">用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title={`修改密码 - ${selectedUser?.name}`}
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码至少6位" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认密码" },
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
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setPasswordModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改角色弹窗 */}
      <Modal
        title={`修改角色 - ${selectedUser?.name}`}
        open={roleModalOpen}
        onCancel={() => {
          setRoleModalOpen(false);
          roleForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleChangeRole}>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select>
              <Select.Option value="user">用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setRoleModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
