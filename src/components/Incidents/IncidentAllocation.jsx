import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI, usersAPI } from '../../services/api';
import './Incidents.css';

const IncidentAllocation = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [incidents, setIncidents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocatingIncident, setAllocatingIncident] = useState(null);
  const [allocationData, setAllocationData] = useState({
    assigneeId: '',
    priority: '',
    dueDate: '',
    notes: ''
  });
  const [filters, setFilters] = useState({
    status: 'unassigned',
    severity: 'all',
    category: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incidentsRes, teamRes] = await Promise.all([
        fetchIncidents(),
        fetchTeamMembers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Use mock data for demonstration
      setIncidents(getMockIncidents());
      setTeamMembers(getMockTeamMembers());
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      const params = {};
      if (filters.status === 'unassigned') {
        params.unassigned = true;
      } else if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.severity !== 'all') {
        params.severity = filters.severity;
      }
      if (filters.category !== 'all') {
        params.category = filters.category;
      }
      
      const response = await incidentsAPI.getAll(params);
      setIncidents(response.data.incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);

    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await usersAPI.getTeamMembers();
      // console.log(response.data);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
     
    }
  };

  

  const handleAllocateClick = (incident) => {
    setAllocatingIncident(incident);
    setAllocationData({
      assigneeId: '',
      priority: incident.severity,
      dueDate: incident.slaTarget ? incident.slaTarget.split('T')[0] : '',
      notes: ''
    });
  };

  const handleAllocationChange = (e) => {
    setAllocationData({
      ...allocationData,
      [e.target.name]: e.target.value
    });
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    
    if (!allocationData.assigneeId) {
      showError('Please select an assignee');
      return;
    }

    try {
      const assignee = teamMembers.find(member => member.id === allocationData.assigneeId);
      
      await incidentsAPI.assign(allocatingIncident._id, {
        assigneeId: allocationData.assigneeId,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`,
        priority: allocationData.priority,
        dueDate: allocationData.dueDate,
        notes: allocationData.notes,
        assignedBy: user.id,
        assignedAt: new Date().toISOString()
      });

      showSuccess(`Incident ${allocatingIncident._id} has been assigned to ${assignee.firstName} ${assignee.lastName}`);
      setAllocatingIncident(null);
      fetchIncidents();
    } catch (error) {
      console.error('Error assigning incident:', error);
      showError('Failed to assign incident');
    }
  };

  const getWorkloadColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'var(--error-500)';
    if (percentage >= 70) return 'var(--warning-500)';
    return 'var(--success-500)';
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

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
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
    <div className="incident-allocation">
      <div className="page-header">
        <h1>Allocate Incidents</h1>
        <p>Assign incidents to team members based on their expertise and workload.</p>
      </div>

      {/* Filters */}
      <div className="allocation-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="form-select"
          >
            <option value="unassigned">Unassigned</option>
            <option value="new">New</option>
            <option value="all">All</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Severity:</label>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
            className="form-select"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="form-select"
          >
            <option value="all">All Categories</option>
            <option value="Network & Connectivity">Network & Connectivity</option>
            <option value="Software & Applications">Software & Applications</option>
            <option value="Security & Access">Security & Access</option>
            <option value="Hardware & Equipment">Hardware & Equipment</option>
          </select>
        </div>
      </div>

      <div className="allocation-content">
        {/* Team Workload Overview */}
        <div className="team-overview">
          <h2>Team Workload</h2>
          <div className="team-members-grid">
            {teamMembers.map(member => (
              <div key={member.id} className="team-member-card">
                <div className="member-info">
                  <div className="member-name">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="member-role">
                    <span className={`badge badge-${member.role}`}>
                      {member.role.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="member-department">{member.department}</div>
                </div>
                
                <div className="workload-info">
                  <div className="workload-text">
                    {member.currentWorkload} / {member.maxWorkload} incidents
                  </div>
                  <div className="workload-bar">
                    <div
                      className="workload-fill"
                      style={{
                        width: `${(member.currentWorkload / member.maxWorkload) * 100}%`,
                        backgroundColor: getWorkloadColor(member.currentWorkload, member.maxWorkload)
                      }}
                    ></div>
                  </div>
                </div>

                {member.expertise && (
                  <div className="member-expertise">
                    <strong>Expertise:</strong>
                    <div className="expertise-tags">
                      {member.expertise.map(skill => (
                        <span key={skill} className="expertise-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Incidents to Allocate */}
        <div className="incidents-to-allocate">
          <h2>Incidents Awaiting Assignment ({incidents.length})</h2>
          
          {incidents.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
              <h3>No incidents to allocate</h3>
              <p>All incidents are currently assigned or resolved.</p>
            </div>
          ) : (
            <div className="incidents-grid">
              {incidents.map(incident => {
                const slaStatus = getSLAStatus(incident);
                
                return (
                  <div key={incident._id} className={`allocation-incident-card incident-${incident.severity}`}>
                    <div className="incident-card-header">
                      <div className="incident-id-section">
                        <span className="incident-id">{incident._id}</span>
                        <div className="incident-badges">
                          <span className={`badge badge-${incident.severity}`}>
                            {incident.severity}
                          </span>
                          <span className={`badge badge-${incident.status}`}>
                            {incident.status}
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
                            <strong>Affected:</strong> {incident.affectedServices}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="incident-card-footer">
                      <button
                        onClick={() => handleAllocateClick(incident)}
                        className="btn btn-primary"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Assign Incident
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Allocation Modal */}
      {allocatingIncident && (
        <div className="modal-overlay">
          <div className="modal allocation-modal">
            <div className="modal-header">
              <h2>Assign Incident {allocatingIncident._id}</h2>
              <button
                onClick={() => setAllocatingIncident(null)}
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
                <h3>{allocatingIncident.title}</h3>
                <p>{allocatingIncident.description}</p>
                <div className="summary-badges">
                  <span className={`badge badge-${allocatingIncident.severity}`}>
                    {allocatingIncident.severity}
                  </span>
                  <span className="category-badge">{allocatingIncident.category}</span>
                </div>
              </div>

              <form onSubmit={handleAllocateSubmit} className="allocation-form">
                <div className="form-group">
                  <label htmlFor="assigneeId" className="form-label required">
                    Assign To
                  </label>
                  <select
                    id="assigneeId"
                    name="assigneeId"
                    value={allocationData.assigneeId}
                    onChange={handleAllocationChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} - {member.department} 
                        ({member.currentWorkload}/{member.maxWorkload} incidents)
                      </option>
                    ))}
                  </select>
                </div>

                {allocationData.assigneeId && (
                  <div className="assignee-info">
                    {(() => {
                      const selectedMember = teamMembers.find(m => m.id === allocationData.assigneeId);
                      return selectedMember ? (
                        <div className="assignee-details">
                          <h4>{selectedMember.firstName} {selectedMember.lastName}</h4>
                          <p><strong>Department:</strong> {selectedMember.department}</p>
                          <p><strong>Expertise:</strong> {selectedMember.expertise?.join(', ')}</p>
                          <div className="workload-display">
                            <strong>Current Workload:</strong>
                            <div className="workload-bar">
                              <div
                                className="workload-fill"
                                style={{
                                  width: `${(selectedMember.currentWorkload / selectedMember.maxWorkload) * 100}%`,
                                  backgroundColor: getWorkloadColor(selectedMember.currentWorkload, selectedMember.maxWorkload)
                                }}
                              ></div>
                            </div>
                            <span>{selectedMember.currentWorkload} / {selectedMember.maxWorkload}</span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="priority" className="form-label">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={allocationData.priority}
                      onChange={handleAllocationChange}
                      className="form-select"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dueDate" className="form-label">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={allocationData.dueDate}
                      onChange={handleAllocationChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="form-label">
                    Assignment Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={allocationData.notes}
                    onChange={handleAllocationChange}
                    className="form-input form-textarea"
                    rows="3"
                    placeholder="Any specific instructions or context for the assignee..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Assign Incident
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAllocatingIncident(null)}
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

export default IncidentAllocation;