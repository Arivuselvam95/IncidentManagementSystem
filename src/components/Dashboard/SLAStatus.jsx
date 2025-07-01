import './Dashboard.css';

const SLAStatus = () => {
  const slaData = [
    {
      severity: 'Critical',
      target: '1 hour',
      current: '45 min',
      percentage: 75,
      status: 'good'
    },
    {
      severity: 'High',
      target: '4 hours',
      current: '3.2 hours',
      percentage: 80,
      status: 'good'
    },
    {
      severity: 'Medium',
      target: '24 hours',
      current: '18 hours',
      percentage: 75,
      status: 'good'
    },
    {
      severity: 'Low',
      target: '72 hours',
      current: '48 hours',
      percentage: 67,
      status: 'warning'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'var(--success-500)';
      case 'warning': return 'var(--warning-500)';
      case 'critical': return 'var(--error-500)';
      default: return 'var(--neutral-500)';
    }
  };

  return (
    <div className="sla-status-card">
      <div className="card-header">
        <h3>SLA Performance</h3>
        <div className="sla-overall">
          <span className="sla-overall-label">Overall:</span>
          <span className="sla-overall-value">74%</span>
        </div>
      </div>
      
      <div className="sla-list">
        {slaData.map((item, index) => (
          <div key={index} className="sla-item">
            <div className="sla-info">
              <div className="sla-severity">
                <span className={`badge badge-${item.severity.toLowerCase()}`}>
                  {item.severity}
                </span>
              </div>
              <div className="sla-details">
                <div className="sla-target">Target: {item.target}</div>
                <div className="sla-current">Current: {item.current}</div>
              </div>
            </div>
            
            <div className="sla-progress">
              <div className="sla-progress-bar">
                <div
                  className="sla-progress-fill"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: getStatusColor(item.status)
                  }}
                ></div>
              </div>
              <div className="sla-percentage">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="sla-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: 'var(--success-500)' }}></div>
          <span>Meeting SLA</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: 'var(--warning-500)' }}></div>
          <span>At Risk</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: 'var(--error-500)' }}></div>
          <span>Breached</span>
        </div>
      </div>
    </div>
  );
};

export default SLAStatus;