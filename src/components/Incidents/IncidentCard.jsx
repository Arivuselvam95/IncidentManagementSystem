import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Incidents.css';

const IncidentCard = ({ incident, onUpdate, onHide, onUnhide, showHideOption = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getSLAStatus = () => {
    if (!incident.slaTarget) return null;
    
    const now = new Date();
    const target = new Date(incident.slaTarget);
    const timeLeft = target - now;
    
    if (timeLeft < 0) {
      return { status: 'breached', text: 'SLA Breached', class: 'sla-breached' };
    } else if (timeLeft < 3600000) { // Less than 1 hour
      const minutesLeft = Math.floor(timeLeft / 60000);
      return { status: 'at-risk', text: `${minutesLeft}m left`, class: 'sla-at-risk' };
    } else {
      const hoursLeft = Math.floor(timeLeft / 3600000);
      return { status: 'on-track', text: `${hoursLeft}h left`, class: 'sla-on-track' };
    }
  };

  const handleHideClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (incident.isHidden) {
      onUnhide(incident._id);
    } else {
      onHide(incident._id);
    }
    setShowActions(false);
  };

  const slaStatus = getSLAStatus();

  return (
    <div className={`incident-card incident-${incident.severity} ${incident.isHidden ? 'incident-hidden' : ''}`}>
      <div className="incident-card-header">
        <div className="incident-id-section">
          <span className="incident-id">{incident.id}</span>
          <div className="incident-badges">
            <span className={`badge badge-${incident.severity}`}>
              {incident.severity}
            </span>
            <span className={`badge badge-${incident.status}`}>
              {incident.status.replace('-', ' ')}
            </span>
            {incident.isHidden && (
              <span className="badge badge-hidden">
                Hidden
              </span>
            )}
          </div>
        </div>
        
        <div className="incident-header-actions">
          {slaStatus && (
            <div className={`sla-indicator ${slaStatus.class}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              {slaStatus.text}
            </div>
          )}
          
          {showHideOption && (incident.status === 'resolved' || incident.status === 'closed') && (
            <div className="incident-menu">
              <button
                className="menu-trigger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              
              {showActions && (
                <div className="menu-dropdown">
                  <button
                    onClick={handleHideClick}
                    className="menu-item"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {incident.isHidden ? (
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      ) : (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      )}
                    </svg>
                    {incident.isHidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="incident-card-body">
        <h3 className="incident-title">{incident.title}</h3>
        
        <p className="incident-description">
          {expanded ? incident.description : 
           incident.description.length > 100 ? 
           `${incident.description.substring(0, 100)}...` : 
           incident.description
          }
        </p>

        {incident.description.length > 100 && (
          <button
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        <div className="incident-meta">
          <div className="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z" />
            </svg>
            <span>{incident.category}</span>
          </div>

          {incident.assignee && (
            <div className="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{incident.assignee.name}</span>
            </div>
          )}

          <div className="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span>{formatTime(incident.createdAt)}</span>
          </div>
        </div>

        {incident.affectedServices && (
          <div className="affected-services">
            <strong>Affected:</strong> {incident.affectedServices}
          </div>
        )}
      </div>

      <div className="incident-card-footer">
        <div className="incident-stats">
          {incident.comments > 0 && (
            <div className="stat-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{incident.comments}</span>
            </div>
          )}
          
          {incident.attachments > 0 && (
            <div className="stat-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
              </svg>
              <span>{incident.attachments}</span>
            </div>
          )}
        </div>

        <div className="incident-actions">
          <Link 
            to={`/incidents/${incident._id}`} 
            className="btn btn-sm btn-outline"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;