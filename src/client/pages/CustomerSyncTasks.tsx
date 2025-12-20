/**
 * 客户同步任务管理页面
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
  Divider,
  Empty,
  Spin,
  Modal,
  Descriptions,
  Badge,
  Tooltip,
  Alert,
  Progress,
} from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Title, Text, Paragraph } = Typography;

interface SyncTask {
  _id: string;
  corpId: string;
  totalWxUsers: number;
  successCount: number;
  failCount: number;
  totalCustomers: number;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface SyncTaskItem {
  _id: string;
  taskId: string;
  wxUserId: string;
  status: "pending" | "running" | "completed" | "failed";
  customerCount: number;
  addedCount: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export function CustomerSyncTasks() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SyncTask | null>(null);
  const [taskItems, setTaskItems] = useState<SyncTaskItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  // 加载任务列表
  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await trpc.customer.getTaskList.query();
      setTasks(result || []);
    } catch (err: any) {
      message.error(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // 创建任务
  const handleCreateTask = async () => {
    setCreating(true);
    try {
      const result = await trpc.customer.createTask.mutate();
      message.success("任务创建成功");
      await loadTasks();
    } catch (err: any) {
      message.error(err?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  // 开始任务
  const handleStartTask = async (taskId: string) => {
    setStarting(taskId);
    try {
      const result = await trpc.customer.startTask.mutate({ taskId });
      message.success(result.message);
      await loadTasks();
    } catch (err: any) {
      message.error(err?.message || "开始失败");
    } finally {
      setStarting(null);
    }
  };

  // 查看详情
  const handleViewDetail = async (task: SyncTask) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const result = await trpc.customer.getTaskDetail.query({ taskId: task._id });
      setTaskItems(result.items || []);
    } catch (err: any) {
      message.error(err?.message || "加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  // 重试单个任务项
  const handleRetryItem = async (item: SyncTaskItem) => {
    setRetrying(item._id);
    try {
      await trpc.customer.retryItem.mutate({ taskItemId: item._id });
      message.success("已添加重试任务");
      // 刷新详情
      if (selectedTask) {
        const result = await trpc.customer.getTaskDetail.query({ taskId: selectedTask._id });
        setTaskItems(result.items || []);
      }
    } catch (err: any) {
      message.error(err?.message || "重试失败");
    } finally {
      setRetrying(null);
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string, text: string }> = {
      pending: { color: "default", text: "待处理" },
      running: { color: "processing", text: "进行中" },
      completed: { color: "success", text: "已完成" },
      failed: { color: "error", text: "失败" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Badge status={config.color as any} text={config.text} />;
  };

  // 任务列表列配置
  const taskColumns = [
    {
      title: "任务ID",
      dataIndex: "_id",
      key: "_id",
      width: 140,
      render: (text: string) => <Text code style={{ fontSize: 11 }}>{text.slice(-8)}</Text>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      align: "center" as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "接粉号",
      dataIndex: "totalWxUsers",
      key: "totalWxUsers",
      width: 80,
      align: "center" as const,
    },
    {
      title: "成功/失败",
      key: "successFail",
      width: 100,
      align: "center" as const,
      render: (record: SyncTask) => (
        <Space size={0}>
          <Text type="success">{record.successCount}</Text>
          <Text>/</Text>
          <Text type="danger">{record.failCount}</Text>
        </Space>
      ),
    },
    {
      title: "进度",
      key: "progress",
      width: 120,
      align: "center" as const,
      render: (record: SyncTask) => {
        const processed = record.successCount + record.failCount;
        const total = record.totalWxUsers;
        const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
        return (
          <div style={{ minWidth: 80 }}>
            <Progress
              percent={percent}
              size="small"
              status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : undefined}
              format={(p) => `${p}%`}
            />
          </div>
        );
      },
    },
    {
      title: "客户数",
      dataIndex: "totalCustomers",
      key: "totalCustomers",
      width: 80,
      align: "center" as const,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (text: string) => <Text type="secondary" style={{ fontSize: 11 }}>{new Date(text).toLocaleString()}</Text>,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      align: "center" as const,
      render: (record: SyncTask) => (
        <Space>
          {record.status === "pending" && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartTask(record._id)}
              loading={starting === record._id}
            >
              开始
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 任务项列配置
  const itemColumns = [
    {
      title: "接粉号",
      dataIndex: "wxUserId",
      key: "wxUserId",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: 11 }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      align: "center" as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "新增/总数",
      key: "count",
      width: 120,
      align: "center" as const,
      render: (record: SyncTaskItem) => (
        <Space direction="vertical" size={0}>
          <Text type="success" style={{ fontSize: 12 }}>+{record.addedCount}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>/{record.customerCount}</Text>
        </Space>
      ),
    },
    {
      title: "错误信息",
      dataIndex: "errorMessage",
      key: "errorMessage",
      width: 200,
      render: (text: string, record: SyncTaskItem) => (
        record.status === "failed" ? (
          <Text
            type="danger"
            style={{
              fontSize: 11,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.4',
            }}
          >
            {text}
          </Text>
        ) : <Text type="secondary" style={{ fontSize: 11 }}>-</Text>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 70,
      align: "center" as const,
      render: (record: SyncTaskItem) => (
        record.status === "failed" ? (
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            onClick={() => handleRetryItem(record)}
            loading={retrying === record._id}
          >
            重试
          </Button>
        ) : null
      ),
    },
  ];

  // 计算任务进度
  const getTaskProgress = (task: SyncTask) => {
    const processed = task.successCount + task.failCount;
    const total = task.totalWxUsers;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    return `${processed}/${total} (${percent}%)`;
  };

  return (
    <div className="fade-in">
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card
            bordered={false}
            className="shadow-sm"
            title={
              <Space>
                <SyncOutlined style={{ color: "#6366f1" }} />
                <span>客户同步任务管理</span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={handleCreateTask}
                  loading={creating}
                >
                  创建同步任务
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadTasks}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Alert
              message="任务说明"
              description="创建任务后会自动开始执行，每个接粉号的同步会独立处理。失败的任务项可以单独重试。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" tip="正在加载..." />
              </div>
            ) : tasks.length === 0 ? (
              <Empty
                description="暂无同步任务"
              >
                <Button type="primary" icon={<SyncOutlined />} onClick={handleCreateTask} loading={creating}>
                  创建第一个任务
                </Button>
              </Empty>
            ) : (
              <Table
                columns={taskColumns}
                dataSource={tasks}
                rowKey="_id"
                scroll={{ x: 'max-content' }}
                size="small"
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: "0 16px" }}>
                      <Descriptions size="small" column={3} bordered>
                        <Descriptions.Item label="企业ID">{record.corpId}</Descriptions.Item>
                        <Descriptions.Item label="进度">{getTaskProgress(record)}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">
                          {new Date(record.createdAt).toLocaleString()}
                        </Descriptions.Item>
                        {record.startedAt && (
                          <Descriptions.Item label="开始时间">
                            {new Date(record.startedAt).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {record.completedAt && (
                          <Descriptions.Item label="完成时间">
                            {new Date(record.completedAt).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {record.errorMessage && (
                          <Descriptions.Item label="错误信息" span={3}>
                            <Text type="danger">{record.errorMessage}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ),
                }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                }}
                locale={{
                  emptyText: "暂无任务数据",
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 任务详情弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>任务详情 - {selectedTask?._id.slice(-8)}</span>
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedTask && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Tag color="blue">总数: {selectedTask.totalWxUsers}</Tag>
              <Tag color="green">成功: {selectedTask.successCount}</Tag>
              <Tag color="red">失败: {selectedTask.failCount}</Tag>
              <Tag color="purple">客户: {selectedTask.totalCustomers}</Tag>
              {selectedTask.status === "running" && (
                <Tag color="processing">进度: {getTaskProgress(selectedTask)}</Tag>
              )}
            </Space>
          </div>
        )}

        {detailLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" tip="正在加载..." />
          </div>
        ) : (
          <Table
            columns={itemColumns}
            dataSource={taskItems}
            rowKey="_id"
            scroll={{ x: 'max-content' }}
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
            locale={{
              emptyText: "暂无任务项",
            }}
          />
        )}
      </Modal>
    </div>
  );
}
