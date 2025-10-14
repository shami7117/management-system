'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Tabs, DatePicker, Select, Button, Spin, Empty, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import dayjs, { Dayjs } from 'dayjs';
import InvoicesReport from '@/components/reports/InvoicesReport';
import TimeTrackingReport from '@/components/reports/TimeTrackingReport';
import TasksReport from '@/components/reports/TasksReport';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface ReportFilter {
  startDate: string;
  endDate: string;
  clientId?: string;
  taskId?: string;
}

interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'Overdue';
  dueDate: Timestamp;
  createdAt: Timestamp;
}

interface TimeEntry {
  id: string;
  userId: string;
  clientId: string;
  hours: number;
  date: Timestamp;
  description: string;
}

interface Task {
  id: string;
  userId: string;
  clientId: string;
  title: string;
  status: 'pending' | 'completed';
  dueDate: Timestamp;
  createdAt: Timestamp;
}

interface Client {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Filter state
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [selectedClient, setSelectedClient] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<string | undefined>(undefined);
  
  const [activeTab, setActiveTab] = useState('invoices');

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, dateRange, selectedClient]);

  const fetchAllData = async () => {
    if (!currentUser) return;
    
    setDataLoading(true);
    try {
      await Promise.all([
        fetchInvoices(),
        fetchTimeEntries(),
        fetchTasks(),
        fetchClients()
      ]);
      message.success('Reports data loaded successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load reports data');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!currentUser) return;

    const startDate = Timestamp.fromDate(dateRange[0].toDate());
    const endDate = Timestamp.fromDate(dateRange[1].toDate());

    let q = query(
      collection(db, 'invoices'),
      where('userId', '==', currentUser.uid),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );

    if (selectedClient) {
      q = query(q, where('clientId', '==', selectedClient));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
    
    setInvoices(data);
  };

  const fetchTimeEntries = async () => {
    if (!currentUser) return;

    const startDate = Timestamp.fromDate(dateRange[0].toDate());
    const endDate = Timestamp.fromDate(dateRange[1].toDate());

    let q = query(
      collection(db, 'timeTracking'),
      where('userId', '==', currentUser.uid),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    if (selectedClient) {
      q = query(q, where('clientId', '==', selectedClient));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];
    
    setTimeEntries(data);
  };

  const fetchTasks = async () => {
    if (!currentUser) return;

    const startDate = Timestamp.fromDate(dateRange[0].toDate());
    const endDate = Timestamp.fromDate(dateRange[1].toDate());

    let q = query(
      collection(db, 'tasks'),
      where('userId', '==', currentUser.uid),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );

    if (selectedClient) {
      q = query(q, where('clientId', '==', selectedClient));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    setTasks(data);
  };

  const fetchClients = async () => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'clients'),
      where('userId', '==', currentUser.uid)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    })) as Client[];
    
    setClients(data);
  };

  const handleExportCSV = () => {
    const filter: ReportFilter = {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      clientId: selectedClient,
      taskId: selectedTask
    };

    let data: any[] = [];
    let filename = '';

    switch (activeTab) {
      case 'invoices':
        data = invoices.map(inv => ({
          ID: inv.id,
          'Client ID': inv.clientId,
          Amount: inv.amount,
          Status: inv.status,
          'Due Date': inv.dueDate.toDate().toLocaleDateString(),
          'Created At': inv.createdAt.toDate().toLocaleDateString()
        }));
        filename = 'invoices_report';
        break;
      case 'time':
        data = timeEntries.map(entry => ({
          ID: entry.id,
          'Client ID': entry.clientId,
          Hours: entry.hours,
          Date: entry.date.toDate().toLocaleDateString(),
          Description: entry.description
        }));
        filename = 'time_tracking_report';
        break;
      case 'tasks':
        data = tasks.map(task => ({
          ID: task.id,
          'Client ID': task.clientId,
          Title: task.title,
          Status: task.status,
          'Due Date': task.dueDate.toDate().toLocaleDateString(),
          'Created At': task.createdAt.toDate().toLocaleDateString()
        }));
        filename = 'tasks_report';
        break;
    }

    exportToCSV(data, filename);
    message.success('CSV exported successfully');
  };

  const handleExportPDF = () => {
    const filter: ReportFilter = {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      clientId: selectedClient,
      taskId: selectedTask
    };

    exportToPDF(
      activeTab,
      { invoices, timeEntries, tasks, clients },
      filter,
      currentUser?.email || 'User'
    );
    message.success('PDF exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (

    <ProtectedRoute>
        <DashboardLayout>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">
          Analyze your invoices, time tracking, and tasks with detailed reports
        </p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="YYYY-MM-DD"
              className="w-full"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <Select
              placeholder="All Clients"
              value={selectedClient}
              onChange={setSelectedClient}
              allowClear
              className="w-full"
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleExportCSV}
              disabled={dataLoading}
            >
              Export CSV
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={dataLoading}
            >
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Reports Tabs */}
      <Card className="shadow-sm">
        {dataLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="Loading reports data..." />
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
            <TabPane tab="Invoices Report" key="invoices">
              <InvoicesReport 
                invoices={invoices} 
                clients={clients}
                dateRange={dateRange}
              />
            </TabPane>
            {/* <TabPane tab="Time Tracking Report" key="time">
              <TimeTrackingReport 
                timeEntries={timeEntries} 
                clients={clients}
                dateRange={dateRange}
              />
            </TabPane> */}
            <TabPane tab="Tasks Report" key="tasks">
              <TasksReport 
                tasks={tasks} 
                clients={clients}
                dateRange={dateRange}
              />
            </TabPane>
          </Tabs>
        )}
      </Card>
    </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}