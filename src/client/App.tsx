/**
 * 主应用组件
 * 使用 Better Auth useSession hook
 * 全局主题配置
 */

import { ConfigProvider, Spin, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useSession } from "./lib/auth-client";
import { AuthPage } from "./pages/Auth";
import { HomePage } from "./pages/Home";

export function App() {
  const { data: session, isPending } = useSession();

  // 自定义主题
  const theme = {
    token: {
      colorPrimary: "#6366f1", // Indigo-500
      borderRadius: 8,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      colorBgLayout: "#f8fafc", // Slate-50
      colorTextBase: "#1e293b", // Slate-800
    },
    components: {
      Button: {
        controlHeightLG: 48,
        fontSizeLG: 16,
        fontWeight: 600,
        colorPrimary: "#6366f1",
        colorPrimaryHover: "#4f46e5", // Indigo-600
        borderRadiusLG: 12,
      },
      Input: {
        controlHeightLG: 48,
        borderRadiusLG: 12,
        colorBgContainer: "#f8fafc", // Slate-50
        activeBorderColor: "#6366f1",
        hoverBorderColor: "#818cf8",
      },
      Card: {
        borderRadiusLG: 24,
        boxShadowTertiary: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      Tabs: {
        itemColor: "#64748b", // Slate-500
        itemSelectedColor: "#6366f1",
        itemHoverColor: "#6366f1",
        titleFontSize: 16,
      },
    },
  };

  if (isPending) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>
        {session ? <HomePage /> : <AuthPage />}
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
