/**
 * 通知组件
 * 简约扁平化现代风格
 */

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Badge, Typography, Empty, Spin, App } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { trpc } from "../trpc";

const { Text } = Typography;

interface NotificationItem {
  _id: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function NotificationModal() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationListResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // 获取未读数量
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await trpc.notification.unreadCount.query();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, []);

  // 获取通知列表
  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const data = await trpc.notification.list.query({ page, limit: 20 });
        setNotifications(data);
      } catch (err) {
        message.error("获取通知失败");
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  // 初始加载未读数量
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // 打开 Modal 时加载通知列表
  const handleOpen = () => {
    setOpen(true);
    fetchNotifications();
  };

  // 标记单个已读
  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await trpc.notification.markAsRead.mutate({ notificationId });
      setNotifications((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item
        ),
      }));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      message.error("操作失败");
    }
  };

  // 标记全部已读
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await trpc.notification.markAllAsRead.mutate();
      setNotifications((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({ ...item, read: true })),
      }));
      setUnreadCount(0);
      message.success("已全部标记为已读");
    } catch (err) {
      message.error("操作失败");
    }
  };

  // 删除单个通知
  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const notification = notifications.items.find(
        (n) => n._id === notificationId
      );
      await trpc.notification.delete.mutate({ notificationId });
      setNotifications((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item._id !== notificationId),
        total: prev.total - 1,
      }));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      message.error("删除失败");
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString("zh-CN");
  };

  return (
    <>
      {/* 通知图标 */}
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={handleOpen}
          style={{ color: "#64748b" }}
        />
      </Badge>

      {/* 通知弹窗 */}
      <Modal
        title={null}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={400}
        centered
        className="notification-modal"
        styles={{
          body: { padding: 0 },
        }}
        closeIcon={null}
      >
        {/* 头部 */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
                通知
              </Text>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontWeight: 500,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined spin={loading} />}
                onClick={() => fetchNotifications()}
                style={{ color: "#94a3b8" }}
              />
              <Button
                type="text"
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                style={{ color: unreadCount > 0 ? "#6366f1" : "#cbd5e1" }}
              >
                全部已读
              </Button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {loading && notifications.items.length === 0 ? (
            <div
              style={{
                padding: 60,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin />
            </div>
          ) : notifications.items.length === 0 ? (
            <Empty
              description={
                <Text style={{ color: "#94a3b8" }}>暂无通知</Text>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "48px 0" }}
            />
          ) : (
            <div>
              {notifications.items.map((item) => (
                <div
                  key={item._id}
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #f8fafc",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    background: item.read ? "#fff" : "#fafbff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = item.read
                      ? "#fff"
                      : "#fafbff";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    {/* 左侧内容 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        {!item.read && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#6366f1",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: item.read ? 400 : 500,
                            color: "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </Text>
                      </div>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.5,
                        }}
                      >
                        {item.content}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          marginTop: 8,
                          display: "block",
                        }}
                      >
                        {formatTime(item.createdAt)}
                      </Text>
                    </div>

                    {/* 右侧操作 */}
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        opacity: 0.6,
                        transition: "opacity 0.2s",
                      }}
                      className="notification-actions"
                    >
                      {!item.read && (
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckOutlined style={{ fontSize: 12 }} />}
                          onClick={(e) => handleMarkAsRead(item._id, e)}
                          style={{
                            width: 28,
                            height: 28,
                            color: "#6366f1",
                            borderRadius: 6,
                          }}
                        />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                        onClick={(e) => handleDelete(item._id, e)}
                        style={{
                          width: 28,
                          height: 28,
                          color: "#94a3b8",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        {notifications.total > 0 && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid #f1f5f9",
              textAlign: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              共 {notifications.total} 条通知
            </Text>
          </div>
        )}
      </Modal>

      {/* 样式 */}
      <style>{`
        .notification-modal .ant-modal-content {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
        }
        .notification-actions {
          opacity: 0;
        }
        div:hover > .notification-actions {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
