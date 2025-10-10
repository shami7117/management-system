"use client";
import { useState, ReactNode } from "react";
import { Layout, Menu, Avatar, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: ReactNode;
}

type MenuItem = Required<MenuProps>["items"][number];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems: MenuItem[] = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/clients", icon: <TeamOutlined />, label: "Clients" },
    { key: "/tasks", icon: <CheckSquareOutlined />, label: "Tasks" },
    { key: "/time-tracking", icon: <ClockCircleOutlined />, label: "Time Tracking" },
    { key: "/invoices", icon: <FileTextOutlined />, label: "Invoices" },
    { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    router.push(key as string);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const userMenuItems: MenuProps["items"] = [
    { key: "email", label: user?.email, disabled: true },
    { type: "divider" },
    { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  return (
    <Layout className="min-h-screen">
      {/* Sidebar */}
      <Sider
      className="flex justify-between items-between"
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onCollapse={(value: boolean) => setCollapsed(value)}
        style={{
          overflow: "hidden",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "#fff", // White sidebar
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top Section (Logo + Menu) */}
        <div className="h-[80%]">
          <div className="h-16 flex items-center justify-center border-b">
            <h1 className="text-gray-800 text-xl font-bold tracking-wider">
              {collapsed ? "WM" : "WorkManager"}
            </h1>
          </div>

          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[pathname || ""]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ backgroundColor: "transparent", borderRight: 0 }}
          />
        </div>

        {/* Bottom Section (User Info + Logout) */}
        <div className="border-t p-3">
          <Dropdown menu={{ items: userMenuItems }} placement="top">
            <div className="flex items-center  gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors">
              <Avatar icon={<UserOutlined />} className="bg-indigo-600" />
              {!collapsed && (
                  <p className="text-sm mb-0 font-medium text-gray-800">
                    {user?.email?.split("@")[0] || "User"}
                  </p>
              )}
            </div>
          </Dropdown>
        </div>
      </Sider>

      {/* Main Layout */}
      <Layout style={{ marginLeft: collapsed ? 0 : 200 }} className="transition-all duration-300">
        {/* Header */}
        <Header
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            padding: "0 16px",
            position: "fixed",
            width: "100%",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="cursor-pointer text-lg w-10 h-10 flex items-center justify-center lg:hidden"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">
              Dashboard
            </h2>
          </div>
        </Header>

        {/* Content Area */}
        <Content
          className="mt-16 p-4 lg:p-6 bg-gray-50"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
