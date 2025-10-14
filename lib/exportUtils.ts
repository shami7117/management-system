import { Timestamp } from 'firebase/firestore';

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

interface ReportData {
  invoices: Invoice[];
  timeEntries: TimeEntry[];
  tasks: Task[];
  clients: Client[];
}

/**
 * Export data to CSV format
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 */
export const exportToCSV = (data: any[], filename: string): void => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quotes
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
};

/**
 * Export report to PDF format
 * Opens a print dialog with formatted report content
 * @param reportType - Type of report: 'invoices', 'time', or 'tasks'
 * @param data - Report data containing all collections
 * @param filter - Active filters applied to the report
 * @param userName - Current user's name or email
 */
export const exportToPDF = (
  reportType: string,
  data: ReportData,
  filter: ReportFilter,
  userName: string
): void => {
  // Create HTML content for PDF
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${reportType.toUpperCase()} Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #333;
          background: white;
        }
        
        .page-header {
          border-bottom: 4px solid #1890ff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        h1 {
          color: #1890ff;
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: 700;
        }
        
        h2 {
          color: #555;
          margin-top: 40px;
          margin-bottom: 20px;
          font-size: 24px;
          font-weight: 600;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 10px;
        }
        
        .report-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 15px;
        }
        
        .info-item {
          display: flex;
          align-items: center;
        }
        
        .info-label {
          font-weight: 600;
          color: #1890ff;
          margin-right: 8px;
        }
        
        .info-value {
          color: #666;
        }
        
        .summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        
        .summary-card {
          border: 2px solid #e8e8e8;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          background: #fafafa;
          transition: all 0.3s ease;
        }
        
        .summary-card.primary {
          border-color: #1890ff;
          background: #e6f7ff;
        }
        
        .summary-card.success {
          border-color: #52c41a;
          background: #f6ffed;
        }
        
        .summary-card.warning {
          border-color: #fa8c16;
          background: #fff7e6;
        }
        
        .summary-card.danger {
          border-color: #ff4d4f;
          background: #fff1f0;
        }
        
        .summary-card .value {
          font-size: 36px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .summary-card.primary .value { color: #1890ff; }
        .summary-card.success .value { color: #52c41a; }
        .summary-card.warning .value { color: #fa8c16; }
        .summary-card.danger .value { color: #ff4d4f; }
        
        .summary-card .label {
          color: #666;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-card .subtitle {
          color: #999;
          font-size: 12px;
          margin-top: 8px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        th {
          background-color: #1890ff;
          color: white;
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          border: 1px solid #e8e8e8;
          padding: 12px;
          font-size: 14px;
        }
        
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        
        tr:hover {
          background-color: #f0f0f0;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        .status-paid {
          background: #f6ffed;
          color: #52c41a;
          border: 1px solid #b7eb8f;
        }
        
        .status-unpaid {
          background: #fff7e6;
          color: #fa8c16;
          border: 1px solid #ffd591;
        }
        
        .status-Overdue {
          background: #fff1f0;
          color: #ff4d4f;
          border: 1px solid #ffccc7;
        }
        
        .status-completed {
          background: #f6ffed;
          color: #52c41a;
          border: 1px solid #b7eb8f;
        }
        
        .status-pending {
          background: #fff7e6;
          color: #fa8c16;
          border: 1px solid #ffd591;
        }
        
        .highlight-row {
          background-color: #fff1f0 !important;
          border-left: 4px solid #ff4d4f;
        }
        
        .client-performance {
          margin: 20px 0;
        }
        
        .client-card {
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: white;
        }
        
        .client-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .client-name {
          font-weight: 600;
          font-size: 16px;
          color: #333;
        }
        
        .client-stats {
          display: flex;
          gap: 20px;
          font-size: 13px;
          color: #666;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1890ff, #52c41a);
          transition: width 0.3s ease;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        
        .footer p {
          margin: 5px 0;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          tr {
            page-break-inside: avoid;
          }
        }
        
        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="page-header">
        <h1>${reportType.toUpperCase()} REPORT</h1>
        <div class="report-info">
          <div class="info-item">
            <span class="info-label">User:</span>
            <span class="info-value">${userName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Period:</span>
            <span class="info-value">${filter.startDate} to ${filter.endDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Generated:</span>
            <span class="info-value">${new Date().toLocaleString()}</span>
          </div>
          ${filter.clientId ? `
          <div class="info-item">
            <span class="info-label">Client Filter:</span>
            <span class="info-value">${getClientNameById(data.clients, filter.clientId)}</span>
          </div>
          ` : ''}
        </div>
      </div>
  `;

  // Add report-specific content
  switch (reportType) {
    case 'invoices':
      htmlContent += generateInvoicesHTML(data);
      break;
    case 'time':
      htmlContent += generateTimeTrackingHTML(data);
      break;
    case 'tasks':
      htmlContent += generateTasksHTML(data);
      break;
  }

  htmlContent += `
      <div class="footer">
        <p><strong>Reports System</strong></p>
        <p>This report was automatically generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>© ${new Date().getFullYear()} All Rights Reserved</p>
      </div>
    </body>
    </html>
  `;

  // Open print dialog with the content
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } else {
    console.error('Failed to open print window. Please check popup blocker settings.');
    alert('Please allow popups to export PDF reports.');
  }
};

/**
 * Helper function to get client name by ID
 */
const getClientNameById = (clients: Client[], clientId: string): string => {
  const client = clients.find(c => c.id === clientId);
  return client ? client.name : 'Unknown Client';
};

/**
 * Generate HTML for Invoices report
 */
const generateInvoicesHTML = (data: ReportData): string => {
  const { invoices, clients } = data;
  
  if (invoices.length === 0) {
    return '<div class="no-data">No invoice data available for the selected period.</div>';
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const unpaidAmount = invoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);
  const OverdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.amount, 0);

  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const unpaidCount = invoices.filter(i => i.status === 'unpaid').length;
  const OverdueCount = invoices.filter(i => i.status === 'Overdue').length;

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  };

  // Calculate invoices by client
  const clientInvoices: { [key: string]: { total: number; amount: number } } = {};
  invoices.forEach(inv => {
    if (!clientInvoices[inv.clientId]) {
      clientInvoices[inv.clientId] = { total: 0, amount: 0 };
    }
    clientInvoices[inv.clientId].total++;
    clientInvoices[inv.clientId].amount += inv.amount;
  });

  return `
    <h2>Executive Summary</h2>
    <div class="summary">
      <div class="summary-card primary">
        <div class="label">Total Invoices</div>
        <div class="value">${invoices.length}</div>
        <div class="subtitle">Total Billed: $${totalAmount.toFixed(2)}</div>
      </div>
      <div class="summary-card success">
        <div class="label">Paid</div>
        <div class="value">$${paidAmount.toFixed(2)}</div>
        <div class="subtitle">${paidCount} invoices (${((paidAmount / totalAmount) * 100).toFixed(1)}%)</div>
      </div>
      <div class="summary-card warning">
        <div class="label">Unpaid</div>
        <div class="value">$${unpaidAmount.toFixed(2)}</div>
        <div class="subtitle">${unpaidCount} invoices (${((unpaidAmount / totalAmount) * 100).toFixed(1)}%)</div>
      </div>
      <div class="summary-card danger">
        <div class="label">Overdue</div>
        <div class="value">$${OverdueAmount.toFixed(2)}</div>
        <div class="subtitle">${OverdueCount} invoices (${((OverdueAmount / totalAmount) * 100).toFixed(1)}%)</div>
      </div>
    </div>

    <h2>Invoices by Client</h2>
    <div class="client-performance">
      ${Object.entries(clientInvoices)
        .sort(([, a], [, b]) => b.amount - a.amount)
        .map(([clientId, stats]) => {
          const percentage = (stats.amount / totalAmount) * 100;
          return `
            <div class="client-card">
              <div class="client-card-header">
                <span class="client-name">${getClientName(clientId)}</span>
                <span class="client-stats">
                  <strong>${stats.total}</strong> invoices • 
                  <strong>$${stats.amount.toFixed(2)}</strong>
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
              </div>
              <div style="margin-top: 5px; font-size: 12px; color: #666;">
                ${percentage.toFixed(1)}% of total revenue
              </div>
            </div>
          `;
        }).join('')}
    </div>

    <h2>Invoice Details</h2>
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Client</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Due Date</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        ${invoices
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .map(inv => `
          <tr ${inv.status === 'Overdue' ? 'class="highlight-row"' : ''}>
            <td><strong>${inv.id.substring(0, 8).toUpperCase()}</strong></td>
            <td>${getClientName(inv.clientId)}</td>
            <td><strong>$${inv.amount.toFixed(2)}</strong></td>
            <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
            <td>${inv.dueDate.toDate().toLocaleDateString()}</td>
            <td>${inv.createdAt.toDate().toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

/**
 * Generate HTML for Time Tracking report
 */
const generateTimeTrackingHTML = (data: ReportData): string => {
  const { timeEntries, clients } = data;
  
  if (timeEntries.length === 0) {
    return '<div class="no-data">No time tracking data available for the selected period.</div>';
  }

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const avgHoursPerDay = totalHours / 30; // Approximate based on typical reporting period

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  };

  // Calculate hours by client
  const clientHours: { [key: string]: number } = {};
  timeEntries.forEach(entry => {
    clientHours[entry.clientId] = (clientHours[entry.clientId] || 0) + entry.hours;
  });

  // Sort clients by hours
  const sortedClientHours = Object.entries(clientHours).sort(([, a], [, b]) => b - a);

  return `
    <h2>Executive Summary</h2>
    <div class="summary">
      <div class="summary-card primary">
        <div class="label">Total Entries</div>
        <div class="value">${timeEntries.length}</div>
        <div class="subtitle">Time logs recorded</div>
      </div>
      <div class="summary-card success">
        <div class="label">Total Hours</div>
        <div class="value">${totalHours.toFixed(1)}</div>
        <div class="subtitle">Hours tracked</div>
      </div>
      <div class="summary-card warning">
        <div class="label">Avg per Day</div>
        <div class="value">${avgHoursPerDay.toFixed(1)}</div>
        <div class="subtitle">Hours per day</div>
      </div>
      <div class="summary-card primary">
        <div class="label">Clients</div>
        <div class="value">${Object.keys(clientHours).length}</div>
        <div class="subtitle">Active clients</div>
      </div>
    </div>

    <h2>Hours by Client</h2>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Hours</th>
          <th>Entries</th>
          <th>Percentage</th>
          <th>Avg per Entry</th>
        </tr>
      </thead>
      <tbody>
        ${sortedClientHours.map(([clientId, hours]) => {
          const entries = timeEntries.filter(e => e.clientId === clientId).length;
          const percentage = (hours / totalHours) * 100;
          const avgPerEntry = hours / entries;
          return `
            <tr>
              <td><strong>${getClientName(clientId)}</strong></td>
              <td><strong>${hours.toFixed(2)} hrs</strong></td>
              <td>${entries}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="progress-bar" style="flex: 1; max-width: 100px;">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                  </div>
                  <span>${percentage.toFixed(1)}%</span>
                </div>
              </td>
              <td>${avgPerEntry.toFixed(2)} hrs</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <h2>Time Entry Details</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client</th>
          <th>Hours</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${timeEntries
          .sort((a, b) => b.date.toMillis() - a.date.toMillis())
          .map(entry => `
          <tr>
            <td>${entry.date.toDate().toLocaleDateString()}</td>
            <td>${getClientName(entry.clientId)}</td>
            <td><strong>${entry.hours.toFixed(2)} hrs</strong></td>
            <td>${entry.description || 'No description'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

/**
 * Generate HTML for Tasks report
 */
const generateTasksHTML = (data: ReportData): string => {
  const { tasks, clients } = data;
  
  if (tasks.length === 0) {
    return '<div class="no-data">No task data available for the selected period.</div>';
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const OverdueTasks = tasks.filter(task => 
    task.status === 'pending' && task.dueDate.toDate() < new Date()
  ).length;

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  };

  const isOverdue = (task: Task): boolean => {
    return task.status === 'pending' && task.dueDate.toDate() < new Date();
  };

  // Calculate tasks by client
  const clientTasks: { [key: string]: { completed: number; pending: number; Overdue: number } } = {};
  tasks.forEach(task => {
    if (!clientTasks[task.clientId]) {
      clientTasks[task.clientId] = { completed: 0, pending: 0, Overdue: 0 };
    }
    if (task.status === 'completed') {
      clientTasks[task.clientId].completed++;
    } else if (isOverdue(task)) {
      clientTasks[task.clientId].Overdue++;
    } else {
      clientTasks[task.clientId].pending++;
    }
  });

  return `
    <h2>Executive Summary</h2>
    <div class="summary">
      <div class="summary-card primary">
        <div class="label">Total Tasks</div>
        <div class="value">${totalTasks}</div>
        <div class="subtitle">All tasks</div>
      </div>
      <div class="summary-card success">
        <div class="label">Completed</div>
        <div class="value">${completedTasks}</div>
        <div class="subtitle">${completionRate.toFixed(1)}% completion rate</div>
      </div>
      <div class="summary-card warning">
        <div class="label">Pending</div>
        <div class="value">${pendingTasks}</div>
        <div class="subtitle">${((pendingTasks / totalTasks) * 100).toFixed(1)}% of total</div>
      </div>
      <div class="summary-card danger">
        <div class="label">Overdue</div>
        <div class="value">${OverdueTasks}</div>
        <div class="subtitle">${pendingTasks > 0 ? ((OverdueTasks / pendingTasks) * 100).toFixed(1) : '0'}% of pending</div>
      </div>
    </div>

    <h2>Tasks by Client</h2>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Total</th>
          <th>Completed</th>
          <th>Pending</th>
          <th>Overdue</th>
          <th>Completion Rate</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(clientTasks)
          .sort(([, a], [, b]) => {
            const totalA = a.completed + a.pending + a.Overdue;
            const totalB = b.completed + b.pending + b.Overdue;
            return totalB - totalA;
          })
          .map(([clientId, stats]) => {
            const total = stats.completed + stats.pending + stats.Overdue;
            const rate = total > 0 ? (stats.completed / total) * 100 : 0;
            return `
              <tr>
                <td><strong>${getClientName(clientId)}</strong></td>
                <td>${total}</td>
                <td><span class="status-badge status-completed">${stats.completed}</span></td>
                <td><span class="status-badge status-pending">${stats.pending}</span></td>
                <td><span class="status-badge status-Overdue">${stats.Overdue}</span></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="progress-bar" style="flex: 1; max-width: 100px;">
                      <div class="progress-fill" style="width: ${rate}%"></div>
                    </div>
                    <span><strong>${rate.toFixed(1)}%</strong></span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
      </tbody>
    </table>

    <h2>Task Details</h2>
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Client</th>
          <th>Status</th>
          <th>Due Date</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        ${tasks
          .sort((a, b) => {
            // Sort Overdue first, then by due date
            const aOverdue = isOverdue(a);
            const bOverdue = isOverdue(b);
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            return a.dueDate.toMillis() - b.dueDate.toMillis();
          })
          .map(task => {
            const Overdue = isOverdue(task);
            return `
              <tr ${Overdue ? 'class="highlight-row"' : ''}>
                <td>${task.title}</td>
                <td>${getClientName(task.clientId)}</td>
                <td>
                  <span class="status-badge ${Overdue ? 'status-Overdue' : `status-${task.status}`}">
                    ${Overdue ? 'OVERDUE' : task.status}
                  </span>
                </td>
                <td ${Overdue ? 'style="color: #ff4d4f; font-weight: bold;"' : ''}>
                  ${task.dueDate.toDate().toLocaleDateString()}
                </td>
                <td>${task.createdAt.toDate().toLocaleDateString()}</td>
              </tr>
            `;
          }).join('')}
      </tbody>
    </table>
  `;
};