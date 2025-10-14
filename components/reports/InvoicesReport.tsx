import { Statistic, Row, Col, Table, Empty } from 'antd';
import { DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { Dayjs } from 'dayjs';

interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'Overdue';
  dueDate: Timestamp;
  createdAt: Timestamp;
}

interface Client {
  id: string;
  name: string;
}

interface InvoiceReport {
  total: number;
  paid: number;
  unpaid: number;
  Overdue: number;
}

interface Props {
  invoices: Invoice[];
  clients: Client[];
  dateRange: [Dayjs, Dayjs];
}

export default function InvoicesReport({ invoices, clients, dateRange }: Props) {
  // Calculate report metrics
  const calculateReport = (): InvoiceReport => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        console.log('Calculating report with invoices:', invoices);

    const paid = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const unpaid = invoices
      .filter(inv => inv.status === 'unpaid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const Overdue = invoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);

    return { total, paid, unpaid, Overdue };
  };

  const report = calculateReport();

  // Prepare chart data (invoices by month)
  const getChartData = () => {
    const monthlyData: { [key: string]: { paid: number; unpaid: number; Overdue: number } } = {};

    invoices.forEach(inv => {
      const date = inv.createdAt.toDate();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { paid: 0, unpaid: 0, Overdue: 0 };
      }

      monthlyData[monthKey][inv.status] += inv.amount;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        Paid: data.paid,
        Unpaid: data.unpaid,
        Overdue: data.Overdue
      }));
  };

  const chartData = getChartData();

  // Prepare table data
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const tableColumns = [
    {
      title: 'Invoice ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => id.substring(0, 8)
    },
    {
      title: 'Client',
      dataIndex: 'clientId',
      key: 'clientId',
      render: (clientId: string) => getClientName(clientId)
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `$${amount?.toFixed(2)}`,
      sorter: (a: Invoice, b: Invoice) => a.amount - b.amount
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          paid: 'text-green-600',
          unpaid: 'text-orange-600',
          Overdue: 'text-red-600'
        };
        return (
          <span className={`font-medium ${colors[status as keyof typeof colors]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Unpaid', value: 'unpaid' },
        { text: 'Overdue', value: 'Overdue' }
      ],
      onFilter: (value: any, record: Invoice) => record.status === value
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: Timestamp) => dueDate.toDate().toLocaleDateString(),
      sorter: (a: Invoice, b: Invoice) => 
        a.dueDate.toMillis() - b.dueDate.toMillis()
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: Timestamp) => createdAt.toDate().toLocaleDateString()
    }
  ];

  if (invoices.length === 0) {
    return (
      <Empty
        description="No invoices found for the selected period"
        className="py-12"
      />
    );
  }
console.log('InvoicesReport rendered with', { invoices, report });
  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {/* <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <Statistic
              title="Total Invoices"
              value={invoices.length}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="text-sm text-gray-600 mt-2">
              Total Billed: ${report.total.toFixed(2)}
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <Statistic
              title="Paid"
              value={report.paid.toFixed(2)}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
              suffix={<CheckCircleOutlined />}
            />
            <div className="text-sm text-gray-600 mt-2">
              {invoices.filter(i => i.status === 'paid').length} invoices
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <Statistic
              title="Unpaid"
              value={report.unpaid.toFixed(2)}
              prefix="$"
              valueStyle={{ color: '#fa8c16' }}
              suffix={<ClockCircleOutlined />}
            />
            <div className="text-sm text-gray-600 mt-2">
              {invoices.filter(i => i.status === 'unpaid').length} invoices
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <Statistic
              title="Overdue"
              value={report.Overdue.toFixed(2)}
              prefix="$"
              valueStyle={{ color: '#ff4d4f' }}
              suffix={<CloseCircleOutlined />}
            />
            <div className="text-sm text-gray-600 mt-2">
              {invoices.filter(i => i.status === 'Overdue').length} invoices
            </div>
          </div>
        </Col>
      </Row> */}

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Invoices by Month</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Paid" fill="#52c41a" />
            <Bar dataKey="Unpaid" fill="#fa8c16" />
            <Bar dataKey="Overdue" fill="#ff4d4f" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <h3 className="text-lg font-semibold p-6 pb-4">Invoice Details</h3>
        <Table
          columns={tableColumns}
          dataSource={invoices}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </div>
    </div>
  );
}