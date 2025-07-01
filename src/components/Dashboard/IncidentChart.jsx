import { useState } from 'react';
import './Dashboard.css';

const IncidentChart = ({ data }) => {
  const [timeRange, setTimeRange] = useState('7d');

  // Mock chart data - in real app, this would be actual chart rendering
  const chartData = data || [
    { date: '2024-01-01', incidents: 12 },
    { date: '2024-01-02', incidents: 8 },
    { date: '2024-01-03', incidents: 15 },
    { date: '2024-01-04', incidents: 6 },
    { date: '2024-01-05', incidents: 11 },
    { date: '2024-01-06', incidents: 9 },
    { date: '2024-01-07', incidents: 13 }
  ];

  const maxValue = Math.max(...chartData.map(d => d.incidents));
  
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Incident Trends</h3>
        <div className="chart-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="form-select chart-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-grid">
          {chartData.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div
                className="chart-bar"
                style={{
                  height: `${(item.incidents / maxValue) * 100}%`
                }}
                title={`${item.incidents} incidents on ${item.date}`}
              >
                <span className="chart-value">{item.incidents}</span>
              </div>
              <div className="chart-label">
                {new Date(item.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color primary"></div>
          <span>Total Incidents</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentChart;