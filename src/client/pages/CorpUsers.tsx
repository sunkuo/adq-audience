/**
 * 企业成员管理页面
 * 用于查看和同步企业微信接粉号成员列表
 */

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  App,
  Typography,
  Space,
  Row,
  Col,
  Table,
  Tag,
  Alert,
  Divider,
  Empty,
  Spin,
  Tooltip,
} from "antd";
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Title, Text, Paragraph } = Typography;

interface CorpUserData {
  id: string;
  wxUserId: string;
  createdAt: string;
}

export function CorpUsers() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [users, setUsers] = useState<CorpUserData[]>([]);
  const [hasConfig, setHasConfig] = useState(true);
  const [total, setTotal] = useState(0);
  const [corpId, setCorpId] = useState("");

  // 加载企业成员列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await trpc.corpUser.list.query();
      setUsers(result.users || []);
      setHasConfig(result.hasConfig !== false);
      setTotal(result.total || 0);
      setCorpId(result.corpId || "");
    } catch (err: any) {
      message.error(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 全量同步
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await trpc.corpUser.sync.mutate();

      if (result.success) {
        message.success(result.message);
        await loadUsers(); // 刷新列表
      } else {
        message.warning(result.message);
      }
    } catch (err: any) {
      message.error(err?.message || "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  // 表格列配置
  const columns = [
    {
      title: "企业微信UserID",
      dataIndex: "wxUserId",
      key: "wxUserId",
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: "#6366f1" }} />
          <Text code>{text}</Text>
        </Space>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(text).toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <TeamOutlined style={{ color: "#6366f1" }} />
                <span>企业成员管理</span>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="从企业微信同步接粉号成员列表">
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={handleSync}
                    loading={syncing}
                    disabled={!hasConfig}
                  >
                    全量同步
                  </Button>
                </Tooltip>
              </Space>
            }
          >
            {!hasConfig && (
              <Alert
                message="未配置企业微信"
                description="请先在系统设置中配置企业微信CorpID和CorpSecret"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {hasConfig && (
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Tag color="blue">企业ID: {corpId}</Tag>
                  <Tag color="green">已同步: {total} 人</Tag>
                  <Tag color="purple">接粉号</Tag>
                </Space>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                接粉号是配置了客户联系功能的企业微信成员，用于接收和管理外部客户联系。
              </Text>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" tip="正在加载..." />
              </div>
            ) : users.length === 0 ? (
              <Empty
                description={
                  <span>
                    {hasConfig ? "暂无企业成员数据" : "未配置企业微信"}
                  </span>
                }
              >
                {hasConfig && (
                  <Button type="primary" icon={<SyncOutlined />} onClick={handleSync} loading={syncing}>
                    立即同步
                  </Button>
                )}
              </Empty>
            ) : (
              <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                }}
                locale={{
                  emptyText: "暂无数据",
                }}
              />
            )}
          </Card>
        </Col>

        {/* 帮助说明 */}
        <Col xs={24}>
          <Card bordered={false} className="shadow-sm">
            <Title level={5} style={{ marginBottom: 12 }}>
              <ExclamationCircleOutlined style={{ marginRight: 8, color: "#faad14" }} />
              使用说明
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>点击"全量同步"按钮，系统会从企业微信获取所有配置了客户联系功能的成员列表</li>
                <li>同步过程会先清空本地数据，然后重新导入最新的成员列表</li>
                <li>同步频率建议：每天同步一次即可，避免频繁调用API</li>
                <li>只有配置了企业微信应用后才能进行同步操作</li>
                <li>access_token会自动管理，无需手动刷新</li>
              </ul>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}