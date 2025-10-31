// app/time-tracking/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Popconfirm,
  Spin,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Adjust path to your Firebase config
import { useAuth } from '../../contexts/AuthContext'; // Adjust path to your AuthContext
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
// TypeScript Interfaces
interface TimeEntry {
  id: string;
  taskId: string;
  clientId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  notes?: string;
  createdAt: string;
  userId?: string;
}

interface Task {
  id: string;
  title: string;
  clientId: string;
}

interface Client {
  id: string;
  name: string;
}

interface TimeEntryFormValues {
  taskId: string;
  clientId: string;
  startTime: Dayjs;
  endTime: Dayjs;
  notes?: string;
}

interface SummaryStats {
  today: number;
  week: number;
  month: number;
}

const TimeTracking: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State Management
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterClient, setFilterClient] = useState<string | undefined>(undefined);
  const [filterTask, setFilterTask] = useState<string | undefined>(undefined);

  // Timer State
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Summary Stats
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    today: 0,
    week: 0,
    month: 0,
  });

  const [form] = Form.useForm();

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Data
  useEffect(() => {
    if (user) {
      fetchClients();
      fetchTasks();
      fetchTimeEntries();
    }
  }, [user]);

  // Apply Filters
  useEffect(() => {
    applyFilters();
  }, [searchText, dateRange, filterClient, filterTask, timeEntries]);

  // Timer Effect
  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const start = new Date(activeTimer.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setElapsedTime(0);
    }
  }, [activeTimer]);

  // Fetch Clients
  const fetchClients = async () => {
    try {
      const clientsRef = collection(db, 'clients');
      const snapshot = await getDocs(clientsRef);
      const clientsList: Client[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
      }));
      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Failed to load clients');
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const snapshot = await getDocs(tasksRef);
      const tasksList: Task[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || 'Unknown',
        clientId: doc.data().clientId,
      }));
      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('Failed to load tasks');
    }
  };

  // Fetch Time Entries
  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      const entriesRef = collection(db, 'timeTracking');
      const q = query(
        entriesRef,
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const entriesList: TimeEntry[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        taskId: doc.data().taskId,
        clientId: doc.data().clientId,
        startTime: doc.data().startTime?.toDate().toISOString() || '',
        endTime: doc.data().endTime?.toDate().toISOString(),
        duration: doc.data().duration,
        notes: doc.data().notes,
        createdAt: doc.data().createdAt?.toDate().toISOString() || '',
        userId: doc.data().userId,
      }));
      setTimeEntries(entriesList);
      setFilteredEntries(entriesList);

      // Find active timer
      const active = entriesList.find((entry) => !entry.endTime);
      setActiveTimer(active || null);

      // Calculate summary stats
      calculateSummaryStats(entriesList);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      message.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Summary Stats
  const calculateSummaryStats = (entries: TimeEntry[]) => {
    const now = dayjs();
    const todayStart = now.startOf('day');
    const weekStart = now.startOf('week');
    const monthStart = now.startOf('month');

    let today = 0;
    let week = 0;
    let month = 0;

    entries.forEach((entry) => {
      if (entry.duration) {
        const entryDate = dayjs(entry.startTime);
        if (entryDate.isAfter(todayStart)) {
          today += entry.duration;
        }
        if (entryDate.isAfter(weekStart)) {
          week += entry.duration;
        }
        if (entryDate.isAfter(monthStart)) {
          month += entry.duration;
        }
      }
    });

    setSummaryStats({
      today: today / 60, // Convert to hours
      week: week / 60,
      month: month / 60,
    });
  };

  // Apply Filters
  const applyFilters = () => {
    let filtered = [...timeEntries];

    // Search filter
    if (searchText.trim()) {
      filtered = filtered.filter((entry) => {
        const task = tasks.find((t) => t.id === entry.taskId);
        const client = clients.find((c) => c.id === entry.clientId);
        const searchLower = searchText.toLowerCase();
        return (
          task?.title.toLowerCase().includes(searchLower) ||
          client?.name.toLowerCase().includes(searchLower) ||
          entry.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.startTime);
        return entryDate.isAfter(start.startOf('day')) && entryDate.isBefore(end.endOf('day'));
      });
    }

    // Client filter
    if (filterClient) {
      filtered = filtered.filter((entry) => entry.clientId === filterClient);
    }

    // Task filter
    if (filterTask) {
      filtered = filtered.filter((entry) => entry.taskId === filterTask);
    }

    setFilteredEntries(filtered);
  };

  // Start Timer
  const handleStartTimer = async () => {
    if (activeTimer) {
      message.warning('A timer is already running. Please stop it first.');
      return;
    }

    Modal.confirm({
      title: 'Start Timer',
      content: 'Select a task to start tracking time.',
      okText: 'Start',
      onOk: async () => {
        // Show task selection modal
        showTimerModal();
      },
    });
  };

  // Show Timer Modal
  const showTimerModal = () => {
    Modal.confirm({
      title: 'Select Task',
      content: (
        <Form layout="vertical">
          <Form.Item label="Task" required>
            <Select
              id="timer-task-select"
              placeholder="Select task"
              options={tasks.map((task) => ({
                value: task.id,
                label: task.title,
              }))}
            />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const taskSelect = document.getElementById('timer-task-select') as any;
        const selectedTaskId = taskSelect?.value;

        if (!selectedTaskId) {
          message.error('Please select a task');
          return;
        }

        const task = tasks.find((t) => t.id === selectedTaskId);
        if (!task) return;

        try {
          const newEntry = {
            taskId: selectedTaskId,
            clientId: task.clientId,
            startTime: Timestamp.now(),
            userId: user?.uid,
            createdAt: Timestamp.now(),
          };
          const docRef = await addDoc(collection(db, 'timeTracking'), newEntry);
          message.success('Timer started successfully');
          fetchTimeEntries();
        } catch (error) {
          console.error('Error starting timer:', error);
          message.error('Failed to start timer');
        }
      },
    });
  };

  // Stop Timer
  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      const endTime = Timestamp.now();
      const start = new Date(activeTimer.startTime).getTime();
      const end = endTime.toDate().getTime();
      const duration = Math.floor((end - start) / 60000); // in minutes

      const entryRef = doc(db, 'timeTracking', activeTimer.id);
      await updateDoc(entryRef, {
        endTime: endTime,
        duration: duration,
      });

      message.success(`Timer stopped. Duration: ${formatDuration(duration)}`);
      setActiveTimer(null);
      fetchTimeEntries();
    } catch (error) {
      console.error('Error stopping timer:', error);
      message.error('Failed to stop timer');
    }
  };

  // Add Manual Entry
  const handleAddEntry = async (values: TimeEntryFormValues) => {
          console.log('Error adding:');

    try {
      const start = values.startTime.toDate();
      const end = values.endTime.toDate();
      const duration = Math.floor((end.getTime() - start.getTime()) / 60000);

      if (duration <= 0) {
        message.error('End time must be after start time');
        return;
      }

      const newEntry = {
        taskId: values.taskId,
        clientId: values.clientId,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        duration: duration,
        notes: values.notes || '',
        userId: user?.uid,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'timeTracking'), newEntry);
      message.success('Entry added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchTimeEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      message.error('Failed to add entry');
    }
  };

  // Edit Entry
  const handleEditEntry = async (values: TimeEntryFormValues) => {
    if (!editingEntry) return;

    try {
      const start = values.startTime.toDate();
      const end = values.endTime.toDate();
      const duration = Math.floor((end.getTime() - start.getTime()) / 60000);

      if (duration <= 0) {
        message.error('End time must be after start time');
        return;
      }

      const entryRef = doc(db, 'timeTracking', editingEntry.id);
      await updateDoc(entryRef, {
        taskId: values.taskId,
        clientId: values.clientId,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        duration: duration,
        notes: values.notes || '',
      });

      message.success('Entry updated successfully');
      setModalVisible(false);
      setEditingEntry(null);
      form.resetFields();
      fetchTimeEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      message.error('Failed to update entry');
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'timeTracking', entryId));
      message.success('Entry deleted successfully');
      fetchTimeEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      message.error('Failed to delete entry');
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingEntry(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Open Edit Modal
  const openEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      taskId: entry.taskId,
      clientId: entry.clientId,
      startTime: dayjs(entry.startTime),
      endTime: entry.endTime ? dayjs(entry.endTime) : undefined,
      notes: entry.notes,
    });
    setModalVisible(true);
  };

  // Handle Modal Submit
  const handleModalSubmit = () => {
    form.validateFields().then((values) => {
      if (editingEntry) {
        handleEditEntry(values);
      } else {
        handleAddEntry(values);
      }
    });
  };

  // Get Task Name
  const getTaskName = (taskId: string): string => {
    const task = tasks.find((t) => t.id === taskId);
    return task?.title || 'Unknown Task';
  };

  // Get Client Name
  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Format Duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format Elapsed Time
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Task', 'Client', 'Start Time', 'End Time', 'Duration', 'Notes'].join(','),
      ...filteredEntries.map((entry) =>
        [
          getTaskName(entry.taskId),
          getClientName(entry.clientId),
          dayjs(entry.startTime).format('YYYY-MM-DD HH:mm'),
          entry.endTime ? dayjs(entry.endTime).format('YYYY-MM-DD HH:mm') : 'Running',
          entry.duration ? formatDuration(entry.duration) : '-',
          entry.notes || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-tracking-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Exported successfully');
  };

  // Table Columns
  const columns: ColumnsType<TimeEntry> = [
    {
      title: 'Task',
      dataIndex: 'taskId',
      key: 'task',
      render: (taskId: string) => getTaskName(taskId),
      responsive: ['xs', 'sm', 'md', 'lg'],
    },
    {
      title: 'Client',
      dataIndex: 'clientId',
      key: 'client',
      render: (clientId: string) => getClientName(clientId),
      responsive: ['sm', 'md', 'lg'],
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => dayjs(time).format('MMM DD, YYYY HH:mm'),
      responsive: ['md', 'lg'],
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time?: string) => (time ? dayjs(time).format('MMM DD, YYYY HH:mm') : <Tag color="green">Running</Tag>),
      responsive: ['md', 'lg'],
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration?: number) => (duration ? formatDuration(duration) : '-'),
      responsive: ['xs', 'sm', 'md', 'lg'],
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            disabled={!record.endTime}
            className="text-blue-600"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Entry"
            description="Are you sure you want to delete this entry?"
            onConfirm={() => handleDeleteEntry(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
      responsive: ['xs', 'sm', 'md', 'lg'],
    },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (

    <ProtectedRoute>
    <DashboardLayout>
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Time Tracking</h1>
        <p className="text-gray-600">Track and manage your work hours</p>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="Today's Hours"
              value={summaryStats.today}
              precision={2}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="This Week"
              value={summaryStats.week}
              precision={2}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="This Month"
              value={summaryStats.month}
              precision={2}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Timer Section */}
      {activeTimer && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-1">
                Timer Running: {getTaskName(activeTimer.taskId)}
              </h3>
              <p className="text-gray-600">Client: {getClientName(activeTimer.clientId)}</p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="text-3xl font-mono font-bold text-blue-600">
                {formatElapsedTime(elapsedTime)}
              </div>
              <Button
                type="primary"
                danger
                icon={<PauseCircleOutlined />}
                size="large"
                onClick={handleStopTimer}
              >
                Stop Timer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Action Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Space wrap>
            {/* <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTimer}
              disabled={!!activeTimer}
              size="large"
            >
              Start Timer
            </Button> */}
            <Button icon={<PlusOutlined />} onClick={openAddModal}>
              Add Entry
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export CSV
            </Button>
          </Space>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            className="w-full"
          />
          <Select
            placeholder="Filter by Client"
            value={filterClient}
            onChange={setFilterClient}
            allowClear
            className="w-full"
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
            }))}
          />
          <Select
            placeholder="Filter by Task"
            value={filterTask}
            onChange={setFilterTask}
            allowClear
            className="w-full"
            options={tasks.map((task) => ({
              value: task.id,
              label: task.title,
            }))}
          />
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredEntries}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} entries`,
            responsive: true,
          }}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* Add/Edit Entry Modal */}
      <Modal
        title={editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingEntry(null);
          form.resetFields();
        }}
        okText={editingEntry ? 'Update' : 'Add'}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Task"
            name="taskId"
            rules={[{ required: true, message: 'Please select a task' }]}
          >
            <Select
              placeholder="Select task"
              showSearch
              optionFilterProp="children"
              onChange={(value) => {
                const task = tasks.find((t) => t.id === value);
                if (task) {
                  form.setFieldsValue({ clientId: task.clientId });
                }
              }}
              options={tasks.map((task) => ({
                value: task.id,
                label: task.title,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Client"
            name="clientId"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select
              placeholder="Select client"
              disabled
              options={clients.map((client) => ({
                value: client.id,
                label: client.name,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Start Time"
                name="startTime"
                rules={[{ required: true, message: 'Please select start time' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="End Time"
                name="endTime"
                rules={[{ required: true, message: 'Please select end time' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Add notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
};

export default TimeTracking;