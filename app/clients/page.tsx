// pages/clients.tsx
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Card,
  Empty,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Adjust path to your firebase config
import { useAuth } from '../../contexts/AuthContext'; // Adjust path to your AuthContext
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
const { Title } = Typography;

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export default function Clients() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch clients from Firestore
  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const clientsData: Client[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        phone: doc.data().phone,
        company: doc.data().company,
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString() || '',
      }));

      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  // Search functionality
  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchText.toLowerCase()) ||
        client.email.toLowerCase().includes(searchText.toLowerCase()) ||
        client.company.toLowerCase().includes(searchText.toLowerCase()) ||
        client.phone.includes(searchText)
    );
    setFilteredClients(filtered);
  }, [searchText, clients]);

  // Open modal for add/edit
  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      form.setFieldsValue({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
      });
    } else {
      setEditingClient(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    form.resetFields();
  };

  // Add or update client
  const handleSubmit = async (values: ClientFormData) => {
    try {
      if (editingClient) {
        // Update existing client
        const clientRef = doc(db, 'clients', editingClient.id);
        await updateDoc(clientRef, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          company: values.company,
        });
        message.success('Client updated successfully');
      } else {
        // Add new client
        await addDoc(collection(db, 'clients'), {
          name: values.name,
          email: values.email,
          phone: values.phone,
          company: values.company,
          createdAt: Timestamp.now(),
        });
        message.success('Client added successfully');
      }
      
      closeModal();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      message.error('Failed to save client');
    }
  };

  // Delete client
  const handleDelete = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      message.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      message.error('Failed to delete client');
    }
  };

  // Table columns
  const columns: ColumnsType<Client> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <Space>
          <UserOutlined className="text-blue-500" />
          <span className="font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
      render: (text) => (
        <Space>
          <MailOutlined className="text-gray-400" />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      responsive: ['lg'],
      render: (text) => (
        <Space>
          <PhoneOutlined className="text-green-500" />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      responsive: ['lg'],
      render: (text) => (
        <Tag icon={<BankOutlined />} color="blue">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['xl'],
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              ghost
              icon={<EditOutlined />}
              size="small"
              onClick={() => openModal(record)}
              className="hover:scale-105 transition-transform"
            />
          </Tooltip>
          <Popconfirm
            title="Delete Client"
            description="Are you sure you want to delete this client?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                className="hover:scale-105 transition-transform"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
        <ProtectedRoute>
            <DashboardLayout>
                    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Title level={2} className="!mb-2">
            Client Management
          </Title>
          <p className="text-gray-600">Manage your clients and their information</p>
        </div>

        <Card
          className="shadow-lg rounded-xl border-0"
          bodyStyle={{ padding: '24px' }}
        >
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
            <Input
              placeholder="Search clients by name, email, company or phone..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-md"
              size="large"
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
              size="large"
              className="bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg transition-all"
            >
              Add Client
            </Button>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={filteredClients}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} clients`,
              className: 'mt-4',
            }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    searchText
                      ? 'No clients found matching your search'
                      : 'No clients yet. Click "Add Client" to get started!'
                  }
                />
              ),
            }}
            className="custom-table"
          />
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-lg">
              <UserOutlined />
              <span>{editingClient ? 'Edit Client' : 'Add New Client'}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          width={600}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-6"
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[
                { required: true, message: 'Please enter client name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="John Doe"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter email address' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="john@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[
                { required: true, message: 'Please enter phone number' },
                {
                  pattern: /^[\d\s\-\+\(\)]+$/,
                  message: 'Please enter a valid phone number',
                },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+1 234 567 8900"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="company"
              label="Company Name"
              rules={[
                { required: true, message: 'Please enter company name' },
                { min: 2, message: 'Company name must be at least 2 characters' },
              ]}
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="Acme Corporation"
                size="large"
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <Space className="w-full justify-end">
                <Button onClick={closeModal} size="large">
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>

      <style jsx global>{`
        .custom-table .ant-table-thead > tr > th {
          background: #f8fafc;
          font-weight: 600;
          color: #1e293b;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f1f5f9;
        }

        .ant-modal-header {
          border-bottom: 1px solid #f0f0f0;
          padding: 20px 24px;
        }

        .ant-modal-body {
          padding: 24px;
        }
      `}</style>
          </div>

      </DashboardLayout>
      </ProtectedRoute>
  );
}