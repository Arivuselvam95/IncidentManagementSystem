import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI } from '../../services/api';
import './IncidentDetails.css';

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await incidentsAPI.getById(id);
      setIncident(response.data);
    } catch (error) {
      console.error('Error fetching incident:', error);
      showError('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setAddingComment(true);
      await incidentsAPI.addComment(incident._id, {
        comment: newComment,
        isInternal
      });
      
      showSuccess('Comment added successfully');
      setNewComment('');
      setIsInternal(false);
      fetchIncident(); // Refresh to get new comment
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSLAStatus = () => {
    if (!incident?.sla?.target) return null;
    
    const now = new Date();
    const target = new Date(incident.sla.target);
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

  const tabs = [
    { id: 'details', label: 'Details', icon: 'info' },
    { id: 'comments', label: 'Comments', icon: 'message-circle', count: incident?.comments?.length },
    { id: 'attachments', label: 'Attachments', icon: 'paperclip', count: incident?.attachments?.length },
    { id: 'activity', label: 'Activity', icon: 'activity', count: incident?.workLogs?.length }
  ];

  const getTabIcon = (iconName) => {
    const icons = {
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'message-circle': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49',
      activity: 'M22 12h-4l-3 9L9 3l-3 9H2'
    };
    return icons[iconName];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading incident details...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="error-container">
        <h2>Incident Not Found</h2>
        <p>The incident you're looking for doesn't exist or you don't have permission to view it.</p>
        <button onClick={() => navigate('/incidents/status')} className="btn btn-primary">
          Back to Incidents
        </button>
      </div>
    );
  }

  const slaStatus = getSLAStatus();

  return (
    <div className="incident-details">
      <div className="incident-details-header">
        <div className="header-top">
          <button 
            onClick={() => navigate('/incidents/status')} 
            className="back-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Incidents
          </button>
          
          <div className="incident-actions">
            {user?.role !== 'reporter' && (
              <>
                <button className="btn btn-outline btn-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button className="btn btn-primary btn-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Assign
                </button>
              </>
            )}
          </div>
        </div>

        <div className="incident-header-info">
          <div className="incident-title-section">
            <div className="incident-id-badge">{incident.incidentId}</div>
            <h1 className="incident-title">{incident.title}</h1>
          </div>

          <div className="incident-meta-badges">
            <span className={`badge badge-${incident.severity}`}>
              {incident.severity}
            </span>
            <span className={`badge badge-${incident.status}`}>
              {incident.status.replace('-', ' ')}
            </span>
            <span className="category-badge">{incident.category}</span>
            {slaStatus && (
              <span className={`sla-badge ${slaStatus.class}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                {slaStatus.text}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="incident-details-content">
        <div className="incident-details-sidebar">
          <div className="sidebar-section">
            <h3>Incident Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Reporter</label>
                <div className="info-value">
                  <div className="user-info">
                    <div className="user-avatar-small">
                      {incident.reporter.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="user-name">{incident.reporter.name}</div>
                      <div className="user-email">{incident.reporter.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {incident.assignee && (
                <div className="info-item">
                  <label>Assignee</label>
                  <div className="info-value">
                    <div className="user-info">
                      <div className="user-avatar-small">
                        {incident.assignee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="user-name">{incident.assignee.name}</div>
                        <div className="assigned-time">
                          Assigned {formatTime(incident.assignee.assignedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-item">
                <label>Priority</label>
                <div className="info-value">
                  <span className={`priority-indicator priority-${incident.priority}`}>
                    {incident.priority}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <label>Created</label>
                <div className="info-value">{formatTime(incident.createdAt)}</div>
              </div>

              <div className="info-item">
                <label>Last Updated</label>
                <div className="info-value">{formatTime(incident.updatedAt)}</div>
              </div>

              {incident.sla?.target && (
                <div className="info-item">
                  <label>SLA Target</label>
                  <div className="info-value">{formatTime(incident.sla.target)}</div>
                </div>
              )}
            </div>
          </div>

          {incident.tags && incident.tags.length > 0 && (
            <div className="sidebar-section">
              <h3>Tags</h3>
              <div className="tags-list">
                {incident.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="incident-details-main">
          <div className="details-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={getTabIcon(tab.icon)} />
                </svg>
                {tab.label}
                {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'details' && (
              <div className="details-tab">
                <div className="details-section">
                  <h3>Description</h3>
                  <p className="incident-description">{incident.description}</p>
                </div>

                {incident.affectedServices && (
                  <div className="details-section">
                    <h3>Affected Services</h3>
                    <p>{incident.affectedServices}</p>
                  </div>
                )}

                {incident.stepsToReproduce && (
                  <div className="details-section">
                    <h3>Steps to Reproduce</h3>
                    <pre className="steps-text">{incident.stepsToReproduce}</pre>
                  </div>
                )}

                <div className="details-grid">
                  {incident.expectedBehavior && (
                    <div className="details-section">
                      <h3>Expected Behavior</h3>
                      <p>{incident.expectedBehavior}</p>
                    </div>
                  )}

                  {incident.actualBehavior && (
                    <div className="details-section">
                      <h3>Actual Behavior</h3>
                      <p>{incident.actualBehavior}</p>
                    </div>
                  )}
                </div>

                {incident.workaround && (
                  <div className="details-section">
                    <h3>Workaround</h3>
                    <div className="workaround-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {incident.workaround}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="comments-tab">
                <div className="comments-list">
                  {incident.comments && incident.comments.length > 0 ? (
                    incident.comments.map(comment => (
                      <div key={comment._id} className={`comment ${comment.isInternal ? 'internal' : ''}`}>
                        <div className="comment-header">
                          <div className="comment-author">
                            <div className="user-avatar-small">
                              {comment.author.firstName[0]}{comment.author.lastName[0]}
                            </div>
                            <div>
                              <div className="author-name">
                                {comment.author.firstName} {comment.author.lastName}
                              </div>
                              <div className="comment-time">{formatTime(comment.createdAt)}</div>
                            </div>
                          </div>
                          {comment.isInternal && (
                            <span className="internal-badge">Internal</span>
                          )}
                        </div>
                        <div className="comment-text">{comment.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No comments yet</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="add-comment-form">
                  <div className="comment-input-section">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="comment-input"
                      rows="3"
                    />
                    <div className="comment-actions">
                      <label className="internal-checkbox">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                        />
                        Internal comment
                      </label>
                      <button
                        type="submit"
                        disabled={!newComment.trim() || addingComment}
                        className="btn btn-primary btn-sm"
                      >
                        {addingComment ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="attachments-tab">
                {incident.attachments && incident.attachments.length > 0 ? (
                  <div className="attachments-list">
                    {incident.attachments.map((attachment, index) => (
                      <div key={index} className="attachment-item">
                        <div className="attachment-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
                          </svg>
                        </div>
                        <div className="attachment-info">
                          <div className="attachment-name">{attachment.originalName}</div>
                          <div className="attachment-meta">
                            {formatFileSize(attachment.size)} • Uploaded {formatTime(attachment.uploadedAt)}
                          </div>
                        </div>
                        <button className="btn btn-outline btn-sm">Download</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
                    </svg>
                    <p>No attachments</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="activity-tab">
                {incident.workLogs && incident.workLogs.length > 0 ? (
                  <div className="activity-timeline">
                    {incident.workLogs.map(log => (
                      <div key={log._id} className={`timeline-item ${log.isSystemGenerated ? 'system' : ''}`}>
                        <div className="timeline-marker">
                          {log.isSystemGenerated ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-action">{log.action}</div>
                            <div className="timeline-time">{formatTime(log.createdAt)}</div>
                          </div>
                          {log.description && (
                            <div className="timeline-description">{log.description}</div>
                          )}
                          <div className="timeline-meta">
                            <span className="timeline-user">
                              {log.user.firstName} {log.user.lastName}
                            </span>
                            {log.timeSpent > 0 && (
                              <span className="timeline-time-spent">
                                • {log.timeSpent} minutes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No activity logged</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;