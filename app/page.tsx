"use client";

import { Card, Statistic, Row, Col, Progress, Spin, Empty } from 'antd';
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
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Link from 'next/link';

// TypeScript Interfaces
interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Task {
  id: string;
  userId: string;
  clientId: string;
  title: string;
  status: string;
  progress: number;
  dueDate: string;
  createdAt: string;
  clientName?: string;
}

interface TimeLog {
  id: string;
  userId: string;
  taskId: string;
  hours: number;
  date: string;
}

interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface Activity {
  id: string;
  userId: string;
  type: 'clientAdded' | 'taskCompleted' | 'timeLogged' | 'invoiceSent';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface DashboardStats {
  totalClients: number;
  activeTasks: number;
  hoursTracked: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  clientsAddedThisMonth: number;
}

interface ActivityConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeTasks: 0,
    hoursTracked: 0,
    pendingInvoices: 0,
    pendingInvoicesAmount: 0,
    clientsAddedThisMonth: 0,
  });
  const [activeProjects, setActiveProjects] = useState<Task[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const userId = user.uid;

        // ===== FETCH TOTAL CLIENTS =====
        const clientsQuery = query(
          collection(db, 'clients'),
          where('userId', '==', userId)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const totalClients = clientsSnapshot.size;

        // Calculate clients added this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const clientsThisMonth = clientsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const createdAt = new Date(data.createdAt);
          return createdAt >= startOfMonth;
        }).length;

        // Create client map for later use
        const clientsMap = new Map<string, string>();
        clientsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          clientsMap.set(doc.id, data.name || 'Unknown');
        });

        // ===== FETCH ACTIVE TASKS =====
        const activeTasksQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', userId),
          where('status', '==', 'active')
        );
        const activeTasksSnapshot = await getDocs(activeTasksQuery);
        const activeTasks = activeTasksSnapshot.size;

        // ===== FETCH HOURS TRACKED (CURRENT MONTH) =====
        const timeTrackingQuery = query(
          collection(db, 'timeTracking'),
          where('userId', '==', userId)
        );
        const timeTrackingSnapshot = await getDocs(timeTrackingQuery);
        
        // Filter for current month and sum hours
        const hoursTracked = timeTrackingSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            const logDate = new Date(data.date);
            return logDate >= startOfMonth;
          })
          .reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.hours || 0);
          }, 0);

        // ===== FETCH PENDING INVOICES =====
        const pendingInvoicesQuery = query(
          collection(db, 'invoices'),
          where('userId', '==', userId),
          where('status', '==', 'unpaid')
        );
        const pendingInvoicesSnapshot = await getDocs(pendingInvoicesQuery);
        const pendingInvoices = pendingInvoicesSnapshot.size;
        const pendingInvoicesAmount = pendingInvoicesSnapshot.docs.reduce(
          (sum, doc) => {
            const data = doc.data();
            return sum + (data.total || 0);
          },
          0
        );

        setStats({
          totalClients,
          activeTasks,
          hoursTracked: Math.round(hoursTracked * 10) / 10,
          pendingInvoices,
          pendingInvoicesAmount,
          clientsAddedThisMonth: clientsThisMonth,
        });

        // ===== FETCH ACTIVE PROJECTS (TOP 4) =====
        const projectsQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', userId),
          where('status', '!=', 'completed'),
          orderBy('status'),
          orderBy('dueDate', 'asc'),
          limit(4)
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projects = projectsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || '',
            clientId: data.clientId || '',
            title: data.title || 'Untitled Project',
            status: data.status || 'active',
            progress: data.progress || 0,
            dueDate: data.dueDate || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
            clientName: clientsMap.get(data.clientId) || 'Unknown Client',
          } as Task;
        });
        setActiveProjects(projects);

        // ===== FETCH RECENT ACTIVITIES (LAST 5) =====
        const activitiesQuery = query(
          collection(db, 'activityLogs'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = activitiesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || '',
            type: data.type as Activity['type'] || 'clientAdded',
            description: data.description || '',
            timestamp: data.timestamp || new Date().toISOString(),
            metadata: data.metadata,
          } as Activity;
        });
        setRecentActivities(activities);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Helper function to format dates
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to get relative time
  const getRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(timestamp);
  };

  // Helper function to get activity icon and color
  const getActivityConfig = (type: Activity['type']): ActivityConfig => {
    switch (type) {
      case 'clientAdded':
        return { 
          icon: <UserOutlined className="text-blue-600" />, 
          color: 'blue',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600'
        };
      case 'taskCompleted':
        return { 
          icon: <CheckCircleOutlined className="text-green-600" />, 
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-600'
        };
      case 'timeLogged':
        return { 
          icon: <ClockCircleOutlined className="text-purple-600" />, 
          color: 'purple',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600'
        };
      case 'invoiceSent':
        return { 
          icon: <FileTextOutlined className="text-orange-600" />, 
          color: 'orange',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-600'
        };
      default:
        return { 
          icon: <UserOutlined className="text-gray-600" />, 
          color: 'gray',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
    }
  };

  // Helper function to get progress bar color
  const getProgressColor = (progress: any): any => {
    if (progress >= 75) return '#8b5cf6';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 25) return '#10b981';
    return '#f59e0b';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Spin size="large" tip="Loading dashboard..." />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

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
                  value={stats.totalClients}
                  prefix={<TeamOutlined className="text-blue-600" />}
                  valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                />
                {stats.clientsAddedThisMonth > 0 && (
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <RiseOutlined className="mr-1" />
                    <span>+{stats.clientsAddedThisMonth} this month</span>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Active Tasks</span>}
                  value={stats.activeTasks}
                  prefix={<CheckCircleOutlined className="text-green-600" />}
                  valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <span>{activeProjects.length} in progress</span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-lg rounded-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow">
                <Statistic
                  title={<span className="text-gray-700 font-medium">Hours Tracked</span>}
                  value={stats.hoursTracked}
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
                  value={stats.pendingInvoices}
                  prefix={<FileTextOutlined className="text-orange-600" />}
                  valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
                />
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <span>${stats.pendingInvoicesAmount.toLocaleString()} total</span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Content Grid */}
        
          {/* Quick Actions */}
          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24}>
              <Card 
                title={<span className="text-lg font-semibold">Quick Actions</span>}
                className="shadow-lg rounded-xl border-0"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/clients">
                    <button className="w-full p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all text-center">
                      <TeamOutlined className="text-3xl text-blue-600 mb-2" />
                      <p className="text-sm font-medium text-gray-800">Add Client</p>
                    </button>
                  </Link>
                  
                  <Link href="/tasks">
                    <button className="w-full p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all text-center">
                      <CheckCircleOutlined className="text-3xl text-green-600 mb-2" />
                      <p className="text-sm font-medium text-gray-800">New Task</p>
                    </button>
                  </Link>
                  
                  <Link href="/time-tracking">
                    <button className="w-full p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all text-center">
                      <ClockCircleOutlined className="text-3xl text-purple-600 mb-2" />
                      <p className="text-sm font-medium text-gray-800">Track Time</p>
                    </button>
                  </Link>
                  
                  <Link href="/invoices">
                    <button className="w-full p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:shadow-md transition-all text-center">
                      <FileTextOutlined className="text-3xl text-orange-600 mb-2" />
                      <p className="text-sm font-medium text-gray-800">Create Invoice</p>
                    </button>
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}