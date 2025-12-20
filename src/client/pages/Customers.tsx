/**
 * 客户管理页面
 * 用于查看和同步企业微信客户详细信息
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
  UserOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Title, Text, Paragraph } = Typography;

interface CustomerData {
  id: string;
  wxUserId: string;
  externalUserid: string;
  name?: string;
  avatar?: string;
  unionid?: string;
  remark?: string;
  description?: string;
  corpName?: string;
  gender?: number;
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
    setLoading(true);
    try {
      const result = await trpc.customer.list.query({ page, pageSize });
      setCustomers(result.customers || []);
      setHasConfig(result.hasConfig !== false);
      setCorpId(result.corpId || "");
      if (result.pagination) {
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


  // 表格列配置
  const columns = [
    {
      title: "接粉号",
      dataIndex: "wxUserId",
      key: "wxUserId",
      width: 150,
      fixed: "left",
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: "#6366f1" }} />
          <Text code>{text}</Text>
        </Space>
      ),
    },
    {
      title: "客户昵称",
      dataIndex: "name",
      key: "name",
      width: 140,
      render: (text: string) => (
        <Text>{text || "-"}</Text>
      ),
    },
    {
      title: "头像",
      dataIndex: "avatar",
      key: "avatar",
      width: 80,
      align: "center",
      render: (text: string) => (
        text ? (
          <Tooltip title={<img src={text} alt="avatar" style={{ width: 80, height: 80, borderRadius: 4 }} />}>
            <img src={text} alt="avatar" style={{ width: 32, height: 32, borderRadius: 4, border: "1px solid #d9d9d9" }} />
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>无</Text>
        )
      ),
    },
    {
      title: "UnionID",
      dataIndex: "unionid",
      key: "unionid",
      width: 220,
      render: (text: string) => (
        text ? <Text code style={{ fontSize: 11 }}>{text}</Text> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: "客户External UserID",
      dataIndex: "externalUserid",
      key: "externalUserid",
      width: 220,
      render: (text: string) => (
        <Text code style={{ fontSize: 11 }}>{text}</Text>
      ),
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 180,
      render: (text: string) => (
        text || <Text type="secondary">-</Text>
      ),
    },
    {
      title: "同步时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      fixed: "right",
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
                <span>客户列表</span>
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
                  <Tag color="purple">详细信息</Tag>
                </Space>
              </div>
            )}

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
              />
            ) : (
              <Table
                columns={columns}
                dataSource={customers}
                rowKey="id"
                key={`table-${pagination.page}-${pagination.pageSize}`}
                scroll={{ x: 1240 }}
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
              功能说明
            </Title>

            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>客户列表显示通过批量获取详情接口同步的完整客户信息</li>
                <li>支持查看客户昵称、头像、UnionID、备注等详细信息</li>
                <li>点击头像可查看大图，UnionID和External UserID以代码块形式显示</li>
                <li>请使用任务管理功能进行批量同步，支持分页递归获取所有数据</li>
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
                  <li><Text code>name</Text> - 客户昵称</li>
                  <li><Text code>avatar</Text> - 客户头像URL</li>
                  <li><Text code>unionid</Text> - 微信UnionID（跨应用唯一标识）</li>
                  <li><Text code>externalUserid</Text> - 企业微信客户唯一标识</li>
                  <li><Text code>remark</Text> - 跟进备注</li>
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
