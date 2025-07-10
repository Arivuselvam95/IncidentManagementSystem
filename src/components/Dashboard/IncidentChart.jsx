import { useState } from 'react';
import './Dashboard.css';

const IncidentChart = ({ data }) => {
  const [timeRange, setTimeRange] = useState('7d');

  // Calculate maximum value for scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.created, d.resolved)),
    1 // Ensure at least 1 to avoid division by zero
  );
  
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
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-grid">
          {data.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar created" 
                style={{
                  height: `${(item.created / maxValue) * 80}%`,
                  backgroundColor: 'var(--primary-500)'
                }}
                title={`${item.created} created`}
              >
                {item.created > 0 && (
                  <span className="chart-value">{item.created}</span>
                )}
              </div>
              <div 
                className="chart-bar resolved chart-bar-resolved" 
                style={{
                  height: `${(item.resolved / maxValue) * 80}%`
                }}
                title={`${item.resolved} resolved`}
              >
                {item.resolved > 0 && (
                  <span className="chart-value">{item.resolved}</span>
                )}
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
          <div className="legend-color" style={{ backgroundColor: 'var(--primary-500)' }}></div>
          <span>Created</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'var(--success-500)' }}></div>
          <span>Resolved</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentChart;