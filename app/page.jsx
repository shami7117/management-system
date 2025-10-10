"use client";

import { Card, Statistic, Row, Col, Progress } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening with your projects today.
            </p>
          </div>

          {/* Stats Cards Grid */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Total Clients</span>}
                  value={12}
                  prefix={<TeamOutlined className="text-blue-600" />}
                  valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-green-600">
                  <RiseOutlined className="mr-1" />
                  <span>+2 this month</span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Active Tasks</span>}
                  value={28}
                  prefix={<CheckCircleOutlined className="text-green-600" />}
                  valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <span>8 due this week</span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Hours Tracked</span>}
                  value={156.5}
                  prefix={<ClockCircleOutlined className="text-purple-600" />}
                  suffix="hrs"
                  valueStyle={{ color: '#9333ea', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <span>This month</span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Pending Invoices</span>}
                  value={5}
                  prefix={<FileTextOutlined className="text-orange-600" />}
                  valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <span>$12,450 total</span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Content Grid */}
          <Row gutter={[16, 16]}>
            {/* Project Progress */}
            <Col xs={24} lg={16}>
              <Card 
                title={<span className="text-lg font-semibold">Active Projects</span>}
                className="shadow-lg rounded-xl border-0 h-full"
              >
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">Website Redesign</span>
                      <span className="text-sm text-gray-600">75%</span>
                    </div>
                    <Progress percent={75} strokeColor="#3b82f6" />
                    <p className="text-xs text-gray-500 mt-1">Client: Tech Corp • Due: Oct 15</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">Mobile App Development</span>
                      <span className="text-sm text-gray-600">45%</span>
                    </div>
                    <Progress percent={45} strokeColor="#10b981" />
                    <p className="text-xs text-gray-500 mt-1">Client: StartupXYZ • Due: Oct 30</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">Brand Identity Design</span>
                      <span className="text-sm text-gray-600">90%</span>
                    </div>
                    <Progress percent={90} strokeColor="#8b5cf6" />
                    <p className="text-xs text-gray-500 mt-1">Client: Fashion Co • Due: Oct 12</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">E-commerce Platform</span>
                      <span className="text-sm text-gray-600">30%</span>
                    </div>
                    <Progress percent={30} strokeColor="#f59e0b" />
                    <p className="text-xs text-gray-500 mt-1">Client: Retail Plus • Due: Nov 5</p>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Recent Activity */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span className="text-lg font-semibold">Recent Activity</span>}
                className="shadow-lg rounded-xl border-0 h-full"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserOutlined className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New client added</p>
                      <p className="text-xs text-gray-500">Tech Solutions Inc.</p>
                      <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircleOutlined className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Task completed</p>
                      <p className="text-xs text-gray-500">Logo design finalized</p>
                      <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ClockCircleOutlined className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Time logged</p>
                      <p className="text-xs text-gray-500">8.5 hours on development</p>
                      <p className="text-xs text-gray-400 mt-1">Yesterday</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileTextOutlined className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Invoice sent</p>
                      <p className="text-xs text-gray-500">Invoice #1024 - $3,500</p>
                      <p className="text-xs text-gray-400 mt-1">2 days ago</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24}>
              <Card 
                title={<span className="text-lg font-semibold">Quick Actions</span>}
                className="shadow-lg rounded-xl border-0"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all text-center">
                    <TeamOutlined className="text-3xl text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-800">Add Client</p>
                  </button>
                  
                  <button className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all text-center">
                    <CheckCircleOutlined className="text-3xl text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-800">New Task</p>
                  </button>
                  
                  <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all text-center">
                    <ClockCircleOutlined className="text-3xl text-purple-600 mb-2" />
                    <p className="text-sm font-medium text-gray-800">Track Time</p>
                  </button>
                  
                  <button className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:shadow-md transition-all text-center">
                    <FileTextOutlined className="text-3xl text-orange-600 mb-2" />
                    <p className="text-sm font-medium text-gray-800">Create Invoice</p>
                  </button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}