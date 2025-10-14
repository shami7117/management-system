import { Statistic, Row, Col, Table, Empty, Tag } from 'antd';
import { ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid ,PieLabelRenderProps} from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

interface TimeEntry {
  id: string;
  userId: string;
  clientId: string;
  hours: number;
  date: Timestamp;
  description: string;
}

interface Client {
  id: string;
  name: string;
}

interface TimeReport {
  totalHours: number;
  hoursByClient: { clientId: string; hours: number }[];
}

interface Props {
  timeEntries: TimeEntry[];
  clients: Client[];
  dateRange: [Dayjs, Dayjs];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function TimeTrackingReport({ timeEntries, clients, dateRange }: Props) {
  // Calculate report metrics
  const calculateReport = (): TimeReport => {
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    
    const clientHours: { [key: string]: number } = {};
    timeEntries.forEach(entry => {
      clientHours[entry.clientId] = (clientHours[entry.clientId] || 0) + entry.hours;
    });

    const hoursByClient = Object.entries(clientHours).map(([clientId, hours]) => ({
      clientId,
      hours
    }));

    return { totalHours, hoursByClient };
  };

  const report = calculateReport();

  // Calculate hours for different periods
  const getHoursForPeriod = (days: number): number => {
    const cutoffDate = dayjs().subtract(days, 'days');
    return timeEntries
      .filter(entry => dayjs(entry.date.toDate()).isAfter(cutoffDate))
      .reduce((sum, entry) => sum + entry.hours, 0);
  };

  const todayHours = getHoursForPeriod(1);
  const weekHours = getHoursForPeriod(7);
  const monthHours = getHoursForPeriod(30);

  // Prepare pie chart data
  const getPieChartData = () => {
    return report.hoursByClient.map(item => {
      const client = clients.find(c => c.id === item.clientId);
      return {
        name: client ? client.name : 'Unknown Client',
        value: item.hours
      };
    });
  };

  const pieChartData = getPieChartData();

  // Prepare daily hours chart
  const getDailyHoursChart = () => {
    const dailyHours: { [key: string]: number } = {};

    timeEntries.forEach(entry => {
      const dateKey = dayjs(entry.date.toDate()).format('YYYY-MM-DD');
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + entry.hours;
    });

    return Object.entries(dailyHours)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => ({
        date: dayjs(date).format('MMM DD'),
        hours
      }));
  };

  const dailyChartData = getDailyHoursChart();

  // Get client name helper
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  // Table columns
  const tableColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: Timestamp) => dayjs(date.toDate()).format('MMM DD, YYYY'),
      sorter: (a: TimeEntry, b: TimeEntry) => 
        a.date.toMillis() - b.date.toMillis(),
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Client',
      dataIndex: 'clientId',
      key: 'clientId',
      render: (clientId: string) => (
        <Tag color="blue">{getClientName(clientId)}</Tag>
      ),
      filters: clients.map(c => ({ text: c.name, value: c.id })),
      onFilter: (value: any, record: TimeEntry) => record.clientId === value
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours: number) => (
        <span className="font-semibold">{hours.toFixed(2)}h</span>
      ),
      sorter: (a: TimeEntry, b: TimeEntry) => a.hours - b.hours
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    }
  ];

  if (timeEntries.length === 0) {
    return (
      <Empty
        description="No time entries found for the selected period"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <Statistic
              title="Total Hours"
              value={report.totalHours.toFixed(2)}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="text-sm text-gray-600 mt-2">
              {timeEntries.length} time entries
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <Statistic
              title="Today"
              value={todayHours.toFixed(2)}
              suffix="hrs"
              valueStyle={{ color: '#52c41a' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <Statistic
              title="This Week"
              value={weekHours.toFixed(2)}
              suffix="hrs"
              valueStyle={{ color: '#722ed1' }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <Statistic
              title="This Month"
              value={monthHours.toFixed(2)}
              suffix="hrs"
              valueStyle={{ color: '#fa8c16' }}
            />
          </div>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Hours by Client</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const value = props.value as number;
                    const percent = (value * 100 / report.totalHours).toFixed(0);
                    return `${props.name}: ${percent}%`;
                  }}                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} hrs`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Daily Hours Tracked</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} hrs`} />
                <Bar dataKey="hours" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Client Summary Table */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Hours by Client Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.hoursByClient.map((item, index) => (
            <div
              key={item.clientId}
              className="p-4 rounded-lg border"
              style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}
            >
              <div className="text-sm text-gray-600">{getClientName(item.clientId)}</div>
              <div className="text-2xl font-bold mt-1">{item.hours.toFixed(2)} hrs</div>
              <div className="text-sm text-gray-500 mt-1">
                {((item.hours / report.totalHours) * 100).toFixed(1)}% of total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-lg border">
        <h3 className="text-lg font-semibold p-6 pb-4">Time Entry Details</h3>
        <Table
          columns={tableColumns}
          dataSource={timeEntries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 600 }}
        />
      </div>
    </div>
  );
}