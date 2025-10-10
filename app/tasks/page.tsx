// pages/tasks.tsx
"use client";
import React, { useState, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
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
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Adjust path to your Firebase config
import { useAuth } from '../../contexts/AuthContext'; // Adjust path to your AuthContext
import dayjs from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
// TypeScript Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface TaskFormValues {
  title: string;
  description: string;
  clientId: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: dayjs.Dayjs;
}

const Tasks: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State Management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchText, setSearchText] = useState<string>('');

  const [form] = Form.useForm();

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Clients and Tasks
  useEffect(() => {
    if (user) {
      fetchClients();
      fetchTasks();
    }
  }, [user]);

  // Search Filter
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter((task) => {
        const client = clients.find((c) => c.id === task.clientId);
        const clientName = client?.name.toLowerCase() || '';
        const title = task.title.toLowerCase();
        const search = searchText.toLowerCase();
        return title.includes(search) || clientName.includes(search);
      });
      setFilteredTasks(filtered);
    }
  }, [searchText, tasks, clients]);

  // Fetch Clients from Firestore
  const fetchClients = async () => {
    try {
      const clientsRef = collection(db, 'clients');
      const snapshot = await getDocs(clientsRef);
      const clientsList: Client[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email,
      }));
      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Failed to load clients');
    }
  };

  // Fetch Tasks from Firestore
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tasksList: Task[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        clientId: doc.data().clientId,
        status: doc.data().status,
        dueDate: doc.data().dueDate,
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
      }));
      setTasks(tasksList);
      setFilteredTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Add Task
  const handleAddTask = async (values: TaskFormValues) => {
    try {
      const newTask = {
        title: values.title,
        description: values.description,
        clientId: values.clientId,
        status: values.status,
        dueDate: values.dueDate.format('YYYY-MM-DD'),
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'tasks'), newTask);
      message.success('Task added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      message.error('Failed to add task');
    }
  };

  // Edit Task
  const handleEditTask = async (values: TaskFormValues) => {
    if (!editingTask) return;
    try {
      const taskRef = doc(db, 'tasks', editingTask.id);
      await updateDoc(taskRef, {
        title: values.title,
        description: values.description,
        clientId: values.clientId,
        status: values.status,
        dueDate: values.dueDate.format('YYYY-MM-DD'),
      });
      message.success('Task updated successfully');
      setModalVisible(false);
      setEditingTask(null);
      form.resetFields();
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      message.error('Failed to update task');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      message.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('Failed to delete task');
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingTask(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Open Edit Modal
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      clientId: task.clientId,
      status: task.status,
      dueDate: dayjs(task.dueDate),
    });
    setModalVisible(true);
  };

  // Handle Modal Submit
  const handleModalSubmit = () => {
    form.validateFields().then((values) => {
      if (editingTask) {
        handleEditTask(values);
      } else {
        handleAddTask(values);
      }
    });
  };

  // Get Client Name
  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Status Color Mapping
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending':
        return 'gold';
      case 'In Progress':
        return 'blue';
      case 'Completed':
        return 'green';
      default:
        return 'default';
    }
  };

  // Table Columns
  const columns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      responsive: ['xs', 'sm', 'md', 'lg'],
    },
    {
      title: 'Client',
      dataIndex: 'clientId',
      key: 'client',
      render: (clientId: string) => getClientName(clientId),
      sorter: (a, b) => getClientName(a.clientId).localeCompare(getClientName(b.clientId)),
      responsive: ['sm', 'md', 'lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
      filters: [
        { text: 'Pending', value: 'Pending' },
        { text: 'In Progress', value: 'In Progress' },
        { text: 'Completed', value: 'Completed' },
      ],
      onFilter: (value, record) => record.status === value,
      responsive: ['xs', 'sm', 'md', 'lg'],
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      responsive: ['md', 'lg'],
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
            className="text-blue-600"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Task"
            description="Are you sure you want to delete this task?"
            onConfirm={() => handleDeleteTask(record.id)}
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
        <DashboardLayout> <div className="p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Task Management</h1>
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Input
            placeholder="Search by task title or client name..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-64 md:w-80"
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
            className="w-full sm:w-auto"
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredTasks}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tasks`,
            responsive: true,
          }}
          scroll={{ x: 800 }}
        />
      </div>

      {/* Add/Edit Task Modal */}
      <Modal
        title={editingTask ? 'Edit Task' : 'Add New Task'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingTask(null);
          form.resetFields();
        }}
        okText={editingTask ? 'Update' : 'Create'}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Task Title"
            name="title"
            rules={[{ required: true, message: 'Please enter task title' }]}
          >
            <Input placeholder="Enter task title" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter task description"
            />
          </Form.Item>

          <Form.Item
            label="Client"
            name="clientId"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select
              placeholder="Select client"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={clients.map((client) => ({
                value: client.id,
                label: client.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Select.Option value="Pending">Pending</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Due Date"
            name="dueDate"
            rules={[{ required: true, message: 'Please select due date' }]}
          >
            <DatePicker
              className="w-full"
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </DashboardLayout>
   
    </ProtectedRoute>
  );
};

export default Tasks;