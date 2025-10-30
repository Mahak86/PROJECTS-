/**
 * Export utilities for generating CSV and PDF reports
 */

/**
 * Convert data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
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
        // Handle values with commas by wrapping in quotes
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export athletes data to CSV
 */
export function exportAthletesCSV(athletes: any[]) {
  const exportData = athletes.map(athlete => ({
    'Name': athlete.name,
    'Email': athlete.email,
    'Age': athlete.age || 'N/A',
    'Gender': athlete.gender || 'N/A',
    'State': athlete.state || 'Unknown',
    'Tests Completed': athlete.testsCompleted || 0,
    'Performance Score': athlete.performanceScore || 0,
    'Joined Date': athlete.createdAt ? new Date(athlete.createdAt).toLocaleDateString() : 'N/A',
  }));

  exportToCSV(exportData, `SAI_Athletes_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Export test results to CSV
 */
export function exportTestResultsCSV(testResults: any[], athletes: any[]) {
  const exportData = testResults.map(test => {
    const athlete = athletes.find(a => a.id === test.userId);
    return {
      'Athlete Name': athlete?.name || 'Unknown',
      'Test Type': test.testType,
      'Score': test.score,
      'Verified': test.verified ? 'Yes' : 'No',
      'Date': new Date(test.timestamp).toLocaleDateString(),
      'Time': new Date(test.timestamp).toLocaleTimeString(),
    };
  });

  exportToCSV(exportData, `SAI_Test_Results_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Export statistics summary to CSV
 */
export function exportStatisticsCSV(stats: any) {
  const exportData = [
    { 'Metric': 'Total Athletes', 'Value': stats.totalAthletes },
    { 'Metric': 'Tests Completed', 'Value': stats.testsCompleted },
    { 'Metric': 'Average Score', 'Value': stats.avgScore },
    { 'Metric': 'Pending Verification', 'Value': stats.pendingVerification },
  ];

  exportToCSV(exportData, `SAI_Statistics_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Generate and download PDF report (basic HTML to print)
 */
export function exportToPDF(htmlContent: string, filename: string) {
  // Create a new window with the content
  const printWindow = window.open('', '', 'height=600,width=800');
  
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1e40af;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 10px;
        }
        h2 {
          color: #3b82f6;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #3b82f6;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary {
          background-color: #eff6ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .summary-item {
          margin: 10px 0;
        }
        .summary-item strong {
          color: #1e40af;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div style="margin-top: 30px; text-align: center;">
        <button onclick="window.print(); setTimeout(() => window.close(), 100);" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print / Save as PDF
        </button>
        <button onclick="window.close();" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
          Cancel
        </button>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
}

/**
 * Generate HTML report for PDF export
 */
export function generateAthleteReportHTML(athletes: any[], stats: any): string {
  const topAthletes = athletes
    .filter(a => a.performanceScore > 0)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 10);

  return `
    <h1>SAI Athlete Performance Report</h1>
    <div class="summary">
      <div class="summary-item"><strong>Report Generated:</strong> ${new Date().toLocaleString()}</div>
      <div class="summary-item"><strong>Total Athletes:</strong> ${stats.totalAthletes}</div>
      <div class="summary-item"><strong>Total Tests Completed:</strong> ${stats.testsCompleted}</div>
      <div class="summary-item"><strong>Average Performance Score:</strong> ${stats.avgScore}</div>
    </div>

    <h2>Top 10 Performing Athletes</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>State</th>
          <th>Performance Score</th>
          <th>Tests Completed</th>
        </tr>
      </thead>
      <tbody>
        ${topAthletes.map((athlete, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${athlete.name}</td>
            <td>${athlete.state || 'Unknown'}</td>
            <td>${athlete.performanceScore}</td>
            <td>${athlete.testsCompleted}/6</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>State-wise Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>State</th>
          <th>Number of Athletes</th>
          <th>Average Score</th>
        </tr>
      </thead>
      <tbody>
        ${stats.stateData?.map((state: any) => `
          <tr>
            <td>${state.state}</td>
            <td>${state.athletes}</td>
            <td>${state.avgScore}</td>
          </tr>
        `).join('') || '<tr><td colspan="3">No data available</td></tr>'}
      </tbody>
    </table>
  `;
}
