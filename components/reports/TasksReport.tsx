import { Statistic, Row, Col, Table, Empty, Tag, Progress } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, PieLabelRenderProps } from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

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

interface TaskReport {
  total: number;
  completed: number;
  pending: number;
}

interface Props {
  tasks: Task[];
  clients: Client[];
  dateRange: [Dayjs, Dayjs];
}

const COLORS = {
  completed: '#52c41a',
  pending: '#fa8c16'
};

export default function TasksReport({ tasks, clients, dateRange }: Props) {
  // Calculate report metrics
  const calculateReport = (): TaskReport => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const pending = tasks.filter(task => task.status === 'pending').length;

    return { total, completed, pending };
  };

  const report = calculateReport();
  const completionRate = report.total > 0 ? (report.completed / report.total) * 100 : 0;

  // Calculate overdue tasks
  const overdueTasks = tasks.filter(task => 
    task.status === 'pending' && 
    task.dueDate?.toDate() < new Date()
  ).length;

  // Prepare pie chart data
  const pieChartData = [
    { name: 'Completed', value: report.completed },
    { name: 'Pending', value: report.pending }
  ];

  // Prepare completion trend chart
  const getCompletionTrend = () => {
    const dailyStats: { [key: string]: { completed: number; pending: number } } = {};

    tasks.forEach(task => {
      const dateKey = dayjs(task.createdAt.toDate()).format('YYYY-MM-DD');
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { completed: 0, pending: 0 };
      }
      dailyStats[dateKey][task.status]++;
    });

    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date: dayjs(date).format('MMM DD'),
        Completed: stats.completed,
        Pending: stats.pending
      }));
  };

  const trendData = getCompletionTrend();

  // Calculate tasks by client
  const getTasksByClient = () => {
    const clientTasks: { [key: string]: { completed: number; pending: number } } = {};

    tasks.forEach(task => {
      if (!clientTasks[task.clientId]) {
        clientTasks[task.clientId] = { completed: 0, pending: 0 };
      }
      clientTasks[task.clientId][task.status]++;
    });

    return Object.entries(clientTasks).map(([clientId, stats]) => {
      const client = clients.find(c => c.id === clientId);
      const total = stats.completed + stats.pending;
      const completionRate = total > 0 ? (stats.completed / total) * 100 : 0;

      return {
        clientId,
        clientName: client ? client.name : 'Unknown Client',
        completed: stats.completed,
        pending: stats.pending,
        total,
        completionRate
      };
    });
  };

  const clientStats = getTasksByClient();

  // Get client name helper
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  // Check if task is overdue
  const isOverdue = (task: Task): boolean => {
    return task.status === 'pending' && task.dueDate.toDate() < new Date();
  };

  // Table columns
  const tableColumns = [
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '30%'
    },
    {
      title: 'Client',
      dataIndex: 'clientId',
      key: 'clientId',
      render: (clientId: string) => (
        <Tag color="blue">{getClientName(clientId)}</Tag>
      ),
      filters: clients.map(c => ({ text: c.name, value: c.id })),
      onFilter: (value: any, record: Task) => record.clientId === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Task) => {
        const overdue = isOverdue(record);
        if (overdue) {
          return <Tag color="red">Overdue</Tag>;
        }
        return (
          <Tag color={status === 'completed' ? 'green' : 'orange'}>
            {status === 'completed' ? 'Completed' : 'Pending'}
          </Tag>
        );
      },
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'Pending', value: 'pending' }
      ],
      onFilter: (value: any, record: Task) => record.status === value
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate: Timestamp, record: Task) => {
        const date:any = dueDate;
        const overdue = isOverdue(record);
        return (
          <span className={overdue ? 'text-red-600 font-semibold' : ''}>
            {dayjs(date).format('MMM DD, YYYY')}
          </span>
        );
      },
      sorter: (a: Task, b: Task) => a.dueDate.toMillis() - b.dueDate.toMillis()
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: Timestamp) => dayjs(createdAt.toDate()).format('MMM DD, YYYY')
    }
  ];

  if (tasks.length === 0) {
    return (
      <Empty
        description="No tasks found for the selected period"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {/* <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <Statistic
              title="Total Tasks"
              value={report.total}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <Statistic
              title="Completed"
              value={report.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="text-sm text-gray-600 mt-2">
              {completionRate.toFixed(1)}% completion rate
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <Statistic
              title="Pending"
              value={report.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <Statistic
              title="Overdue"
              value={overdueTasks}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div className="text-sm text-gray-600 mt-2">
              {report.pending > 0 ? `${((overdueTasks / report.pending) * 100).toFixed(1)}% of pending` : 'No pending tasks'}
            </div>
          </div>
        </Col>
      </Row> */}

      {/* Completion Rate Progress */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Overall Completion Rate</h3>
        <Progress
          percent={completionRate}
          status={completionRate === 100 ? 'success' : 'active'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          style={{ fontSize: '18px' }}
        />
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{report.completed}</div>
            <div className="text-sm text-gray-600">Completed Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{report.pending}</div>
            <div className="text-sm text-gray-600">Pending Tasks</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const value = props.value as number;
                    const percent = (value * 100 / report.total).toFixed(0);
                    return `${props.name}: ${percent}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Completed' ? COLORS.completed : COLORS.pending} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Task Creation Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Completed" stroke={COLORS.completed} strokeWidth={2} />
                <Line type="monotone" dataKey="Pending" stroke={COLORS.pending} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Client Performance */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Tasks by Client</h3>
        <div className="space-y-4">
          {clientStats.map((stat) => (
            <div key={stat.clientId} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{stat.clientName}</span>
                <span className="text-sm text-gray-600">
                  {stat.completed} / {stat.total} completed
                </span>
              </div>
              <Progress
                percent={stat.completionRate}
                status={stat.completionRate === 100 ? 'success' : 'active'}
                strokeColor={stat.completionRate >= 75 ? '#52c41a' : stat.completionRate >= 50 ? '#1890ff' : '#fa8c16'}
              />
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">✓ {stat.completed} completed</span>
                <span className="text-orange-600">⏳ {stat.pending} pending</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg border">
        <h3 className="text-lg font-semibold p-6 pb-4">Task Details</h3>
        <Table
          columns={tableColumns}
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          rowClassName={(record) => isOverdue(record) ? 'bg-red-50' : ''}
        />
      </div>
    </div>
  );
}