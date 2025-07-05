import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI } from '../../services/api';
import './Incidents.css';

const IncidentResolving = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [updatingIncident, setUpdatingIncident] = useState(null);
  const [resolutionData, setResolutionData] = useState({
    resolutionNotes: '',
    rootCause: '',
    preventiveMeasures: '',
    resolutionCategory: '',
    timeSpent: '',
    satisfactionRating: ''
  });
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    notes: ''
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      // Fetch only incidents assigned to the current user
      const all1 = await incidentsAPI.getAll({ assigneeId: user._id });
      // console.log('Fetched incidents:', all1.data.incidents," user:", user,"assignee:", all1.data.incidents.map(i => i.assignee.user._id));
      const all=all1.data.incidents.filter(i => i.assignee && i.assignee.user._id === user._id);
      // console.log(all.data.incidents);
      const incidents = all.filter(i =>
        ['assigned', 'in-progress','pending'].includes(i.status)
      );
      setIncidents(incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };


  const resolutionCategories = [
    'Configuration Change',
    'Software Update/Patch',
    'Hardware Replacement',
    'Network Fix',
    'User Training',
    'Process Improvement',
    'Third-party Vendor',
    'Other'
  ];

  const statusOptions = [
    { value: 'in-progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' }
  ];

  const handleResolveClick = (incident) => {
    setResolvingIncident(incident);
    setResolutionData({
      resolutionNotes: '',
      rootCause: '',
      preventiveMeasures: '',
      resolutionCategory: '',
      timeSpent: '',
      satisfactionRating: ''
    });
  };

  const handleStatusUpdateClick = (incident) => {
    setUpdatingIncident(incident);
    setStatusUpdateData({
      status: incident.status,
      notes: ''
    });
  };

  const handleResolutionChange = (e) => {
    setResolutionData({
      ...resolutionData,
      [e.target.name]: e.target.value
    });
  };

  const handleStatusUpdateChange = (e) => {
    setStatusUpdateData({
      ...statusUpdateData,
      [e.target.name]: e.target.value
    });
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    
    if (!resolutionData.resolutionNotes.trim()) {
      showError('Resolution notes are required');
      return;
    }

    try {
      await incidentsAPI.resolve(resolvingIncident._id, {
        ...resolutionData,
        resolvedBy: user.id,
        resolvedAt: new Date().toISOString()
      });

      showSuccess(`Incident ${resolvingIncident._id} has been resolved successfully`);
      setResolvingIncident(null);
      fetchIncidents();
    } catch (error) {
      console.error('Error resolving incident:', error);
      showError('Failed to resolve incident');
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await incidentsAPI.update(updatingIncident._id, {
        status: statusUpdateData.status,
        statusNotes: statusUpdateData.notes,
        updatedBy: user.id,
        updatedAt: new Date().toISOString()
      });

      showSuccess(`Incident ${updatingIncident._id} status updated successfully`);
      setUpdatingIncident(null);
      fetchIncidents();
    } catch (error) {
      console.error('Error updating incident status:', error);
      showError('Failed to update incident status');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getSLAStatus = (incident) => {
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading incidents...</p>
      </div>
    );
  }

  return (
    <div className="incident-resolving">
      <div className="page-header">
        <h1>My Assigned Incidents</h1>
        <p>Manage and resolve incidents assigned to you.</p>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
          <h3>No incidents assigned</h3>
          <p>You don't have any incidents assigned to you that need attention.</p>
        </div>
      ) : (
        <div className="incidents-grid">
          {incidents.map(incident => {
            const slaStatus = getSLAStatus(incident);
            
            return (
              <div key={incident._id} className={`resolve-incident-card incident-${incident.severity}`}>
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
                    </div>
                  </div>
                  
                  {slaStatus && (
                    <div className={`sla-indicator ${slaStatus.class}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      {slaStatus.text}
                    </div>
                  )}
                </div>

                <div className="incident-card-body">
                  <h3 className="incident-title">{incident.title}</h3>
                  <p className="incident-description">{incident.description}</p>

                  <div className="incident-details">
                    <div className="detail-item">
                      <strong>Category:</strong> {incident.category}
                    </div>
                    <div className="detail-item">
                      <strong>Reporter:</strong> {incident.reporter.name}
                    </div>
                    <div className="detail-item">
                      <strong>Created:</strong> {formatTime(incident.createdAt)}
                    </div>
                    {incident.affectedServices && (
                      <div className="detail-item">
                        <strong>Affected Services:</strong> {incident.affectedServices}
                      </div>
                    )}
                  </div>

                  {incident.workLogs && incident.workLogs.length > 0 && (
                    <div className="work-logs">
                      <h4>Work Log:</h4>
                      <div className="work-log-list">
                        {incident.workLogs.map((log, index) => (
                          <div key={index} className="work-log-item">
                            <div className="work-log-time">
                              {formatTime(log.updatedAt)}
                            </div>
                            <div className="work-log-action">{log.action}</div>
                            <div className="work-log-user">by {log.user}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="incident-card-footer">
                  <div className="incident-actions">
                    <button
                      onClick={() => handleStatusUpdateClick(incident)}
                      className="btn btn-outline btn-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Update Status
                    </button>
                    
                    <button
                      onClick={() => handleResolveClick(incident)}
                      className="btn btn-success btn-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Update Modal */}
      {updatingIncident && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Update Status - {updatingIncident.id}</h2>
              <button
                onClick={() => setUpdatingIncident(null)}
                className="modal-close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="incident-summary">
                <h3>{updatingIncident.title}</h3>
                <p>{updatingIncident.description}</p>
              </div>

              <form onSubmit={handleStatusUpdateSubmit} className="status-update-form">
                <div className="form-group">
                  <label htmlFor="status" className="form-label required">
                    New Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={statusUpdateData.status}
                    onChange={handleStatusUpdateChange}
                    className="form-select"
                    required
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="form-label">
                    Update Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={statusUpdateData.notes}
                    onChange={handleStatusUpdateChange}
                    className="form-input form-textarea"
                    rows="3"
                    placeholder="Add notes about this status update..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Update Status
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setUpdatingIncident(null)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolvingIncident && (
        <div className="modal-overlay">
          <div className="modal resolution-modal">
            <div className="modal-header">
              <h2>Resolve Incident {resolvingIncident.id}</h2>
              <button
                onClick={() => setResolvingIncident(null)}
                className="modal-close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="incident-summary">
                <h3>{resolvingIncident.title}</h3>
                <p>{resolvingIncident.description}</p>
              </div>

              <form onSubmit={handleResolveSubmit} className="resolution-form">
                <div className="form-group">
                  <label htmlFor="resolutionNotes" className="form-label required">
                    Resolution Notes
                  </label>
                  <textarea
                    id="resolutionNotes"
                    name="resolutionNotes"
                    value={resolutionData.resolutionNotes}
                    onChange={handleResolutionChange}
                    className="form-input form-textarea"
                    required
                    rows="4"
                    placeholder="Describe how you resolved this incident..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="rootCause" className="form-label">
                    Root Cause Analysis
                  </label>
                  <textarea
                    id="rootCause"
                    name="rootCause"
                    value={resolutionData.rootCause}
                    onChange={handleResolutionChange}
                    className="form-input form-textarea"
                    rows="3"
                    placeholder="What was the underlying cause of this incident?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="preventiveMeasures" className="form-label">
                    Preventive Measures
                  </label>
                  <textarea
                    id="preventiveMeasures"
                    name="preventiveMeasures"
                    value={resolutionData.preventiveMeasures}
                    onChange={handleResolutionChange}
                    className="form-input form-textarea"
                    rows="2"
                    placeholder="What steps can prevent this incident from recurring?"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="resolutionCategory" className="form-label">
                      Resolution Category
                    </label>
                    <select
                      id="resolutionCategory"
                      name="resolutionCategory"
                      value={resolutionData.resolutionCategory}
                      onChange={handleResolutionChange}
                      className="form-select"
                    >
                      <option value="">Select category</option>
                      {resolutionCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="timeSpent" className="form-label">
                      Time Spent (hours)
                    </label>
                    <input
                      type="number"
                      id="timeSpent"
                      name="timeSpent"
                      value={resolutionData.timeSpent}
                      onChange={handleResolutionChange}
                      className="form-input"
                      step="0.5"
                      min="0"
                      placeholder="2.5"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-success"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resolve Incident
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setResolvingIncident(null)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentResolving;