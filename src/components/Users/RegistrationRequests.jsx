import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usersAPI } from '../../services/api';
import './RegistrationRequests.css';

const RegistrationRequests = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    fetchRegistrationRequests();
  }, []);

  const fetchRegistrationRequests = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getRegistrationRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      // Mock data for demonstration
      setRequests(getMockRequests());
    } finally {
      setLoading(false);
    }
  };

  const getMockRequests = () => [
    {
      _id: 'req1',
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex.johnson@company.com',
      role: 'it-support',
      department: 'IT Support',
      requestedAt: '2024-01-07T10:30:00Z',
      status: 'pending'
    },
    {
      _id: 'req2',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@company.com',
      role: 'team-lead',
      department: 'Network Operations',
      requestedAt: '2024-01-07T09:15:00Z',
      status: 'pending'
    },
    {
      _id: 'req3',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@company.com',
      role: 'it-support',
      department: 'Security',
      requestedAt: '2024-01-06T14:20:00Z',
      status: 'pending'
    }
  ];

  const handleApproveRequest = async (requestId, requestData) => {
    if (!window.confirm(`Approve registration for ${requestData.firstName} ${requestData.lastName}?`)) {
      return;
    }

    try {
      setProcessingRequest(requestId);
      await usersAPI.approveRegistrationRequest(requestId, {
        approvedBy: user.id,
        approvedAt: new Date().toISOString()
      });
      
      showSuccess(`Registration approved for ${requestData.firstName} ${requestData.lastName}`);
      fetchRegistrationRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      showError('Failed to approve registration request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId, requestData) => {
    const reason = window.prompt(`Reject registration for ${requestData.firstName} ${requestData.lastName}?\n\nPlease provide a reason (optional):`);
    
    if (reason === null) return; // User cancelled

    try {
      setProcessingRequest(requestId);
      await usersAPI.rejectRegistrationRequest(requestId, {
        rejectedBy: user.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'No reason provided'
      });
      
      showSuccess(`Registration rejected for ${requestData.firstName} ${requestData.lastName}`);
      fetchRegistrationRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError('Failed to reject registration request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const canApproveRequest = (requestRole) => {
    if (user.role === 'admin') return true;
    if (user.role === 'team-lead' && requestRole === 'it-support') return true;
    return false;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading registration requests...</p>
      </div>
    );
  }

  return (
    <div className="registration-requests">
      <div className="page-header">
        <h1>Registration Requests</h1>
        <p>Review and approve IT team registration requests</p>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>No pending requests</h3>
          <p>There are no registration requests waiting for approval.</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map(request => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {request.firstName[0]}{request.lastName[0]}
                  </div>
                  <div className="user-details">
                    <h3 className="user-name">
                      {request.firstName} {request.lastName}
                    </h3>
                    <p className="user-email">{request.email}</p>
                  </div>
                </div>
                <div className="request-time">
                  {formatDate(request.requestedAt)}
                </div>
              </div>

              <div className="request-details">
                <div className="detail-item">
                  <span className="detail-label">Requested Role:</span>
                  <span className={`detail-value badge badge-${request.role}`}>
                    {request.role.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">{request.department}</span>
                </div>
              </div>

              <div className="request-actions">
                {canApproveRequest(request.role) ? (
                  <>
                    <button
                      onClick={() => handleApproveRequest(request._id, request)}
                      disabled={processingRequest === request._id}
                      className="btn btn-success btn-sm"
                    >
                      {processingRequest === request._id ? (
                        <>
                          <span className="spinner"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request._id, request)}
                      disabled={processingRequest === request._id}
                      className="btn btn-danger btn-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="no-permission">
                    <span className="permission-text">
                      You don't have permission to approve this role
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationRequests;