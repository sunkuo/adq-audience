/**
 * 客户管理页面（第一阶段）
 * 用于查看和同步企业微信客户列表（只显示external_userid）
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
  Descriptions,
} from "antd";
import {
  SyncOutlined,
  UserOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Title, Text, Paragraph } = Typography;

interface CustomerData {
  id: string;
  wxUserId: string;
  externalUserid: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function Customers() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [hasConfig, setHasConfig] = useState(true);
  const [corpId, setCorpId] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // 加载客户列表（带分页）
  const loadCustomers = async (page: number = 1, pageSize: number = 20) => {
    console.log(`[Customers] Loading page ${page}, pageSize ${pageSize}`);
    setLoading(true);
    try {
      const result = await trpc.customer.list.query({ page, pageSize });
      console.log(`[Customers] Result:`, result);
      setCustomers(result.customers || []);
      setHasConfig(result.hasConfig !== false);
      setCorpId(result.corpId || "");
      if (result.pagination) {
        console.log(`[Customers] Setting pagination:`, result.pagination);
        setPagination(result.pagination);
      }
    } catch (err: any) {
      message.error(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(1, 20);
  }, []);

  // 调试：监控 pagination 变化
  useEffect(() => {
    console.log(`[Customers] pagination state updated:`, pagination);
  }, [pagination]);

  // 全量同步客户
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await trpc.customer.sync.mutate();

      if (result.success) {
        message.success(result.message);
        await loadCustomers(pagination.page, pagination.pageSize);
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
      title: "接粉号",
      dataIndex: "wxUserId",
      key: "wxUserId",
      width: 180,
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: "#6366f1" }} />
          <Text code>{text}</Text>
        </Space>
      ),
    },
    {
      title: "客户External UserID",
      dataIndex: "externalUserid",
      key: "externalUserid",
      render: (text: string) => (
        <Text code style={{ fontSize: 12 }}>{text}</Text>
      ),
    },
    {
      title: "同步时间",
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
                <CustomerServiceOutlined style={{ color: "#6366f1" }} />
                <span>客户列表（第一阶段）</span>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="同步所有接粉号的客户external_userid">
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
                description="请先在系统设置中配置企业微信CorpID和CorpSecret，并同步企业成员"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {hasConfig && (
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Tag color="blue">企业ID: {corpId}</Tag>
                  <Tag color="green">总客户数: {pagination.total}</Tag>
                  <Tag color="purple">第一阶段</Tag>
                </Space>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                第一阶段：只同步客户的 external_userid 列表。后续阶段会获取客户详细信息（姓名、职位、头像等）。
              </Text>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" tip="正在加载..." />
              </div>
            ) : customers.length === 0 ? (
              <Empty
                description={
                  <span>
                    {hasConfig ? "暂无客户数据" : "未配置企业微信"}
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
                dataSource={customers}
                rowKey="id"
                key={`table-${pagination.page}-${pagination.pageSize}`}
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  onChange: (page, pageSize) => {
                    loadCustomers(page, pageSize);
                  },
                  onShowSizeChange: (current, size) => {
                    loadCustomers(1, size);
                  },
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
              <CheckCircleOutlined style={{ marginRight: 8, color: "#52c41a" }} />
              阶段说明
            </Title>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="阶段一">
                <Text strong>已完成</Text> - 同步客户 external_userid 列表
              </Descriptions.Item>
              <Descriptions.Item label="阶段二">
                <Text type="secondary">待开发</Text> - 获取客户详细信息（姓名、职位、头像等）
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "16px 0" }} />

            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>点击"全量同步"会遍历所有接粉号，获取每个接粉号的客户列表</li>
                <li>每个接粉号的客户列表会自动去重后存储</li>
                <li>第一阶段只存储客户的 external_userid，这是客户在企业微信中的唯一标识</li>
                <li>需要先同步企业成员（接粉号）才能同步客户列表</li>
                <li>access_token 会自动管理，无需手动刷新</li>
                <li>表格支持后端分页，可调整每页显示数量和跳转页码</li>
              </ul>
            </Paragraph>

            <Divider style={{ margin: "16px 0" }} />

            <div>
              <Text strong>数据字段说明：</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 8 }}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li><Text code>wxUserId</Text> - 接粉号（企业成员）的userid</li>
                  <li><Text code>externalUserid</Text> - 客户的external_userid（企业微信中的客户唯一标识）</li>
                  <li><Text code>createdAt</Text> - 同步时间</li>
                </ul>
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
