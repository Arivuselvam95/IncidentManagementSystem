import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI, usersAPI } from '../../services/api';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [editData, setEditData] = useState({});
  const [assignData, setAssignData] = useState({
    assigneeId: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchIncident();
      if(user.role === 'admin' || user.role === 'team-lead' )
        fetchTeamMembers();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await incidentsAPI.getById(id);
      setIncident(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching incident:', error);
      showError('Failed to load incident details');
      // Use mock data for demonstration
      const mockIncident = getMockIncident();
      setIncident(mockIncident);
      setEditData(mockIncident);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await usersAPI.getTeamMembers();
      // console.log('Fetched team members:', response.data);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
      
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
      fetchIncident();
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await incidentsAPI.update(incident._id, editData);
      showSuccess('Incident updated successfully');
      setShowEditModal(false);
      fetchIncident();
    } catch (error) {
      console.error('Error updating incident:', error);
      showError('Failed to update incident');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignData.assigneeId) {
      showError('Please select an assignee');
      return;
    }

    try {
      const assignee = teamMembers.find(member => member.id === assignData.assigneeId);
      await incidentsAPI.assign(incident._id, {
        assigneeId: assignData.assigneeId,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`,
        notes: assignData.notes
      });
      
      showSuccess(`Incident assigned to ${assignee.firstName} ${assignee.lastName}`);
      setShowAssignModal(false);
      setAssignData({ assigneeId: '', notes: '' });
      fetchIncident();
    } catch (error) {
      console.error('Error assigning incident:', error);
      showError('Failed to assign incident');
    }
  };

  const canEdit = () => {
    return user?.role === 'admin' || user?.role === 'team-lead' || 
           (incident?.assignee?.user === user?.id);
  };

  const canAssign = () => {
    return (user?.role === 'admin' || user?.role === 'team-lead') && (incident?.status === 'new' || incident?.status === 'in-progress');
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
    } else if (timeLeft < 3600000) {
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
            {canEdit() && (
              <button 
                onClick={() => setShowEditModal(true)}
                className="btn btn-outline btn-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
            {canAssign() &&  (
              <button 
                onClick={() => setShowAssignModal(true)}
                className="btn btn-primary btn-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Assign
              </button>
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
                          {attachment.base64Data ? (
                            <img 
                              src={attachment.base64Data} 
                              alt={attachment.originalName}
                              className="attachment-thumbnail"
                              style={{ width: '300px', height: '300px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
                            </svg>
                          )}
                        </div>
                        <div className="attachment-info">
                          <div className="attachment-name">{attachment.originalName}</div>
                          <div className="attachment-meta">
                            {formatFileSize(attachment.size)} • Uploaded {formatTime(attachment.uploadedAt)}
                          </div>
                        </div>
                        <div className="attachment-actions">
                          {attachment.base64Data && (
                            <>
                              <button 
                                onClick={() => {
                                  const newWindow = window.open();
                                  if (newWindow) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${attachment.originalName}</title></head>
                                        <body style="margin:0">
                                          <img src="${attachment.base64Data}" alt="${attachment.originalName}" style="max-width:100vw; max-height:100vh; object-fit:contain;" />
                                        </body>
                                      </html>
                                      
                                    `);
                                    newWindow.document.close();
                                  }

                                }}
                                className="btn btn-outline btn-sm"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = attachment.base64Data;
                                  link.download = attachment.originalName;
                                  link.click();
                                }}
                                className="btn btn-outline btn-sm"
                              >
                                Download
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Incident</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    className="form-input form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select
                      value={editData.severity || ''}
                      onChange={(e) => setEditData({...editData, severity: e.target.value})}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={editData.status || ''}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="new">New</option>
                      <option value="assigned">Assigned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Assign Incident</h2>
              <button onClick={() => setShowAssignModal(false)} className="modal-close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAssignSubmit}>
                <div className="form-group">
                  <label className="form-label required">Assign To</label>
                  <select
                    value={assignData.assigneeId}
                    onChange={(e) => setAssignData({...assignData, assigneeId: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} - {member.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignment Notes</label>
                  <textarea
                    value={assignData.notes}
                    onChange={(e) => setAssignData({...assignData, notes: e.target.value})}
                    className="form-input form-textarea"
                    rows="3"
                    placeholder="Any specific instructions..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Assign Incident</button>
                  <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetails;