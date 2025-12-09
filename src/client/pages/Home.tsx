/**
 * 首页 - Dashboard 布局
 * 包含侧边栏、顶部导航和内容区域
 */

import { useState } from "react";
import { Button, Card, Typography, Avatar, Row, Col, Statistic, Tag, App, Layout, Menu, Dropdown, Breadcrumb, theme } from "antd";
import { 
  UserOutlined, 
  LogoutOutlined, 
  DashboardOutlined, 
  SettingOutlined, 
  BellOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { useSession, signOut } from "../lib/auth-client";
import { UserManagement } from "./UserManagement";
import type { MenuItemType } from "antd/es/menu/interface";

const { Title, Text } = Typography;
const { Header, Sider, Content } = Layout;

export function HomePage() {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检查用户是否是管理员
  const isAdmin = session?.user?.role === "admin";

  const handleLogout = async () => {
    await signOut();
    message.success("已安全退出");
  };

  // 侧边栏菜单
  const menuItems: MenuItemType[] = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "仪表盘",
    },
    // 只有管理员才能看到用户管理
    ...(isAdmin ? [{
      key: "users",
      icon: <TeamOutlined />,
      label: "用户管理",
    }] : []),
    {
      key: "content",
      icon: <FileTextOutlined />,
      label: "内容管理",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "系统设置",
    },
    {
      key: "security",
      icon: <SafetyCertificateOutlined />,
      label: "安全中心",
    },
  ];

  // 用户下拉菜单
  const userMenu = {
    items: [
      { key: "profile", label: "个人资料", icon: <UserOutlined /> },
      { key: "settings", label: "偏好设置", icon: <SettingOutlined /> },
      { type: "divider" as const },
      { key: "logout", label: "退出登录", icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: "#fff",
          borderRight: "1px solid rgba(0,0,0,0.05)",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 101
        }}
        width={240}
      >
        <div style={{ 
          height: 64, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? 0 : "0 24px",
          borderBottom: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ 
            width: 32, height: 32, 
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", 
            borderRadius: 8,
            display: "grid", placeItems: "center",
            color: "white", fontWeight: "bold",
            flexShrink: 0
          }}>
            B
          </div>
          {!collapsed && (
            <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
              Admin Plus
            </span>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          style={{ borderRight: 0, padding: "8px 0" }}
          onClick={({ key }) => setCurrentPage(key)}
        />
      </Sider>

      {/* 右侧布局 */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "all 0.2s" }}>
        {/* 顶部导航 */}
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64 }}
            />
            <Breadcrumb 
              items={[
                { title: '首页' },
                { title: currentPage === 'dashboard' ? '仪表盘' : 
                         currentPage === 'users' ? '用户管理' :
                         currentPage === 'content' ? '内容管理' :
                         currentPage === 'settings' ? '系统设置' :
                         currentPage === 'security' ? '安全中心' : '仪表盘' },
              ]}
              style={{ marginLeft: 8 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", paddingRight: 24, gap: 16 }}>
            <Button type="text" shape="circle" icon={<BellOutlined />} />
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 6 }} className="hover:bg-gray-100">
                <Avatar 
                  style={{ backgroundColor: "#6366f1" }} 
                  icon={<UserOutlined />} 
                  src={session?.user?.image}
                />
                <span style={{ fontWeight: 500, color: "#334155" }}>
                  {session?.user?.name || session?.user?.email?.split("@")[0]}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content style={{ margin: "24px 16px", padding: 24, minHeight: 280 }}>
          {/* 用户管理页面 - 仅管理员可访问 */}
          {currentPage === "users" && isAdmin && <UserManagement />}

          {/* 仪表盘页面 */}
          {currentPage === "dashboard" && (
            <div className="fade-in">
              {/* 欢迎 Banner */}
              <Card 
                bordered={false}
                style={{ 
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  borderRadius: 24,
                  color: "white",
                  marginBottom: 24,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div style={{ position: "relative", zIndex: 1, padding: "12px" }}>
                  <Row align="middle" gutter={24}>
                    <Col flex="1">
                      <Title level={2} style={{ color: "white", marginBottom: 8 }}>
                        早安, {session?.user?.name || "开发者"}! ☀️
                      </Title>
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }}>
                        准备好开始今天的开发工作了吗？Admin Plus 已为您准备就绪。
                      </Text>
                      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                        <Button type="default" size="large" icon={<RocketOutlined />} style={{ border: "none" }}>
                          开始探索
                        </Button>
                        <Button ghost size="large" icon={<SafetyCertificateOutlined />}>
                          查看文档
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </div>
                <div style={{ position: "absolute", top: -50, right: -50, width: 300, height: 300, background: "rgba(255,255,255,0.1)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", bottom: -80, left: 100, width: 200, height: 200, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
              </Card>

              {/* 统计卡片 */}
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition-all">
                    <Statistic 
                      title="系统状态" 
                      value="运行中" 
                      valueStyle={{ color: "#10b981", fontWeight: 600 }}
                      prefix={<ThunderboltOutlined />}
                    />
                    <Tag color="success" style={{ marginTop: 8 }}>v1.0.0</Tag>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition-all">
                    <Statistic 
                      title="活跃用户" 
                      value={128} 
                      valueStyle={{ fontWeight: 600 }}
                      prefix={<TeamOutlined />}
                    />
                    <Text type="success" style={{ fontSize: 12 }}>+12% 较上周</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition-all">
                    <Statistic 
                      title="认证方式" 
                      value="Username" 
                      valueStyle={{ fontSize: 18, fontWeight: 600 }}
                    />
                    <Tag color="blue" style={{ marginTop: 8 }}>Admin Plus</Tag>
                  </Card>
                </Col>
              </Row>

              {/* 功能入口 */}
              <Title level={4} style={{ margin: "24px 0 16px", color: "#334155" }}>常用功能</Title>
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={8}>
                  <Card 
                    hoverable 
                    bordered={false} 
                    style={{ height: "100%", cursor: isAdmin ? "pointer" : "default" }}
                    onClick={() => isAdmin && setCurrentPage("users")}
                  >
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: "#f3e8ff", color: "#9333ea" }} icon={<UserOutlined />} />}
                      title={
                        <span>
                          用户管理 {!isAdmin && <Tag color="default">需要管理员权限</Tag>}
                        </span>
                      }
                      description="管理系统用户、角色和权限配置"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card hoverable bordered={false} style={{ height: "100%" }}>
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: "#dbeafe", color: "#2563eb" }} icon={<SafetyCertificateOutlined />} />}
                      title="安全审计"
                      description="查看系统安全日志和访问记录"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card hoverable bordered={false} style={{ height: "100%" }}>
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: "#ffe4e6", color: "#e11d48" }} icon={<SettingOutlined />} />}
                      title="系统配置"
                      description="修改系统全局参数和显示设置"
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* 其他页面占位 */}
          {currentPage === "content" && (
            <div className="fade-in">
              <Card bordered={false}>
                <Title level={4}>内容管理</Title>
                <Text type="secondary">功能开发中...</Text>
              </Card>
            </div>
          )}
          {currentPage === "settings" && (
            <div className="fade-in">
              <Card bordered={false}>
                <Title level={4}>系统设置</Title>
                <Text type="secondary">功能开发中...</Text>
              </Card>
            </div>
          )}
          {currentPage === "security" && (
            <div className="fade-in">
              <Card bordered={false}>
                <Title level={4}>安全中心</Title>
                <Text type="secondary">功能开发中...</Text>
              </Card>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
