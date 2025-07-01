import { Link } from 'react-router-dom';
import './Dashboard.css';

const RecentIncidents = ({ incidents }) => {
  const mockIncidents = incidents || [
    {
      id: 'INC-001',
      title: 'Server connectivity issues',
      severity: 'critical',
      status: 'open',
      assignee: 'John Doe',
      createdAt: '2024-01-07T10:30:00Z'
    },
    {
      id: 'INC-002',
      title: 'Email system slow response',
      severity: 'medium',
      status: 'in-progress',
      assignee: 'Jane Smith',
      createdAt: '2024-01-07T09:15:00Z'
    },
    {
      id: 'INC-003',
      title: 'Application deployment failed',
      severity: 'high',
      status: 'assigned',
      assignee: 'Mike Johnson',
      createdAt: '2024-01-07T08:45:00Z'
    },
    {
      id: 'INC-004',
      title: 'Printer not working on 3rd floor',
      severity: 'low',
      status: 'resolved',
      assignee: 'Sarah Wilson',
      createdAt: '2024-01-06T16:20:00Z'
    }
  ];

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <div className="recent-incidents-card">
      <div className="card-header">
        <h3>Recent Incidents</h3>
        <Link to="/incidents/status" className="view-all-link">
          View All
        </Link>
      </div>
      
      <div className="incidents-list">
        {mockIncidents.map((incident) => (
          <div key={incident.id} className="incident-item">
            <div className="incident-main">
              <div className="incident-header">
                <span className="incident-id">{incident.id}</span>
                <span className={`badge badge-${incident.severity}`}>
                  {incident.severity}
                </span>
              </div>
              
              <h4 className="incident-title">{incident.title}</h4>
              
              <div className="incident-meta">
                <div className="incident-assignee">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {incident.assignee}
                </div>
                <div className="incident-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  {formatTime(incident.createdAt)}
                </div>
              </div>
            </div>
            
            <div className="incident-status">
              <span className={`badge badge-${incident.status}`}>
                {incident.status.replace('-', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {mockIncidents.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
          <p>No recent incidents</p>
        </div>
      )}
    </div>
  );
};

export default RecentIncidents;