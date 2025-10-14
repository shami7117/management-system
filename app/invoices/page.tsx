// app/invoices/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase'; // Adjust import path
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  InputNumber, 
  Space, 
  message, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Card,
  Divider,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  FilePdfOutlined,
  SearchOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';

// TypeScript Interfaces
interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  items: InvoiceItem[];
  total: number;
  status: "Paid" | "Unpaid" | "Overdue";
  dueDate: string;
  createdAt: string;
}

interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function InvoicesPage() {
  const [user, loading] = useAuthState(auth);
  const [form] = Form.useForm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Fetch user-specific invoices
  const fetchInvoices = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'invoices'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const invoicesData: Invoice[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invoicesData.push({
          id: doc.id,
          userId: data.userId,
          invoiceNumber: data.invoiceNumber,
          clientId: data.clientId,
          clientName: data.clientName,
          items: data.items,
          total: data.total,
          status: data.status,
          dueDate: data.dueDate.toDate().toISOString(),
          createdAt: data.createdAt.toDate().toISOString(),
        });
      });
      
      setInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      message.error('Failed to fetch invoices');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user-specific clients
  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const clientsData: Client[] = [];
      
      querySnapshot.forEach((doc) => {
        clientsData.push({
          id: doc.id,
          ...doc.data()
        } as Client);
      });
      
      setClients(clientsData);
    } catch (error) {
      message.error('Failed to fetch clients');
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
    }
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...invoices];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(inv => inv.clientId === clientFilter);
    }

    // Search filter
    if (searchText) {
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        inv.clientName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  }, [statusFilter, clientFilter, searchText, invoices]);

  // Generate next invoice number
  const generateInvoiceNumber = () => {
    const maxNumber = invoices.reduce((max, inv) => {
      const num = parseInt(inv.invoiceNumber.split('-')[1]);
      return num > max ? num : max;
    }, 0);
    return `INV-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  // Handle create/edit invoice
  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('You must be logged in');
      return;
    }

    try {
      setIsLoading(true);

      // Calculate items and total
      const items: InvoiceItem[] = values.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
      }));

      const total = items.reduce((sum, item) => sum + item.amount, 0);

      // Get client name
      const client = clients.find(c => c.id === values.clientId);

      const invoiceData = {
        userId: user.uid,
        invoiceNumber: editingInvoice ? editingInvoice.invoiceNumber : generateInvoiceNumber(),
        clientId: values.clientId,
        clientName: client?.name || '',
        items,
        total,
        status: values.status,
        dueDate: Timestamp.fromDate(values.dueDate.toDate()),
        createdAt: editingInvoice 
          ? Timestamp.fromDate(new Date(editingInvoice.createdAt))
          : Timestamp.now(),
      };

      if (editingInvoice) {
        // Verify ownership before updating
        if (editingInvoice.userId !== user.uid) {
          message.error('You do not have permission to edit this invoice');
          return;
        }
        await updateDoc(doc(db, 'invoices', editingInvoice.id), invoiceData);
        message.success('Invoice updated successfully');
      } else {
        await addDoc(collection(db, 'invoices'), invoiceData);
        message.success('Invoice created successfully');
      }

      setIsModalVisible(false);
      setEditingInvoice(null);
      form.resetFields();
      fetchInvoices();
    } catch (error) {
      message.error('Failed to save invoice');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete invoice
  const handleDelete = async (invoice: Invoice) => {
    if (!user) return;

    // Verify ownership before deleting
    if (invoice.userId !== user.uid) {
      message.error('You do not have permission to delete this invoice');
      return;
    }

    try {
      await deleteDoc(doc(db, 'invoices', invoice.id));
      message.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      message.error('Failed to delete invoice');
      console.error(error);
    }
  };

  // Handle edit
  const handleEdit = (invoice: Invoice) => {
    // Verify ownership before editing
    if (!user) {
      message.error('You must be logged in to edit invoices');
      return;
    }
    if (invoice.userId !== user.uid) {
      message.error('You do not have permission to edit this invoice');
      return;
    }

    setEditingInvoice(invoice);
    form.setFieldsValue({
      clientId: invoice.clientId,
      items: invoice.items,
      status: invoice.status,
      dueDate: dayjs(invoice.dueDate),
    });
    setIsModalVisible(true);
  };

  // Handle status update
  const handleStatusUpdate = async (invoice: Invoice, newStatus: "Paid" | "Unpaid" | "Overdue") => {
    if (!user || invoice.userId !== user.uid) {
      message.error('You do not have permission to update this invoice');
      return;
    }

    try {
      await updateDoc(doc(db, 'invoices', invoice.id), { status: newStatus });
      message.success('Status updated successfully');
      fetchInvoices();
    } catch (error) {
      message.error('Failed to update status');
      console.error(error);
    }
  };

  // Generate PDF
  const handleGeneratePDF = (invoice: Invoice) => {
    // Basic PDF generation logic - you can use libraries like jsPDF or react-pdf
    message.info('PDF generation feature - implement with jsPDF or react-pdf');
    // Example: Create a new window with printable invoice
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML(invoice));
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Generate HTML for invoice
  const generateInvoiceHTML = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .invoice-details { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h2>${invoice.invoiceNumber}</h2>
          </div>
          <div class="invoice-details">
            <p><strong>Client:</strong> ${client?.name || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${dayjs(invoice.dueDate).format('MMM DD, YYYY')}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.rate.toFixed(2)}</td>
                  <td>$${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            Total: $${invoice.total.toFixed(2)}
          </div>
        </body>
      </html>
    `;
  };

  // Handle email invoice
  const handleEmailInvoice = (invoice: Invoice) => {
    message.info('Email feature - implement with Firebase Functions + SendGrid');
    // You would call a Firebase Function here that sends the email
  };

  // Table columns
  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => `$${total.toFixed(2)}`,
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Invoice) => (
        <Select
          value={status}
          onChange={(value:any) => handleStatusUpdate(record, value)}
          style={{ width: 120 }}
          options={[
            { label: <Tag color="green">Paid</Tag>, value: 'Paid' },
            { label: <Tag color="orange">Unpaid</Tag>, value: 'Unpaid' },
            { label: <Tag color="red">Overdue</Tag>, value: 'Overdue' },
          ]}
        />
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Invoice) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => handleGeneratePDF(record)}
            size="small"
          />
          {/* <Button
            icon={<MailOutlined />}
            onClick={() => handleEmailInvoice(record)}
            size="small"
          /> */}
          <Popconfirm
            title="Are you sure you want to delete this invoice?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <p>Please log in to view invoices.</p>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
        <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <Row justify="space-between" align="middle" className="mb-6">
          <Col>
            <h1 className="text-3xl font-bold m-0">Invoices</h1>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingInvoice(null);
                form.resetFields();
                setIsModalVisible(true);
              }}
              size="large"
            >
              Create Invoice
            </Button>
          </Col>
        </Row>

        <Divider />

        {/* Filters */}
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search invoices..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Paid', value: 'Paid' },
                { label: 'Unpaid', value: 'Unpaid' },
                { label: 'Overdue', value: 'Overdue' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by client"
              value={clientFilter}
              onChange={setClientFilter}
              options={[
                { label: 'All Clients', value: 'all' },
                ...clients.map(client => ({
                  label: client.name,
                  value: client.id,
                })),
              ]}
            />
          </Col>
        </Row>

        {/* Invoices Table */}
        <Table
          columns={columns}
          dataSource={filteredInvoices}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} invoices`,
          }}
        />
      </Card>

      {/* Create/Edit Invoice Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingInvoice(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'Unpaid',
            items: [{ description: '', quantity: 1, rate: 0 }],
          }}
        >
          <Form.Item
            name="clientId"
            label="Client"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select
              placeholder="Select a client"
              options={clients.map(client => ({
                label: client.name,
                value: client.id,
              }))}
            />
          </Form.Item>

          <Divider>Line Items</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="Description" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber
                          placeholder="Qty"
                          min={1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'rate']}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber
                          placeholder="Rate"
                          min={0}
                          prefix="$"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'amount']}
                        dependencies={[[name, 'quantity'], [name, 'rate']]}
                      >
                        <Input
                          placeholder="Amount"
                          disabled
                          value={
                            (form.getFieldValue(['items', name, 'quantity']) || 0) *
                            (form.getFieldValue(['items', name, 'rate']) || 0)
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={1}>
                      {fields.length > 1 && (
                        <Button
                          type="link"
                          danger
                          onClick={() => remove(name)}
                          icon={<DeleteOutlined />}
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Line Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select
                  options={[
                    { label: 'Paid', value: 'Paid' },
                    { label: 'Unpaid', value: 'Unpaid' },
                    { label: 'Overdue', value: 'Overdue' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                setEditingInvoice(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}