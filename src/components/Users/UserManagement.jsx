import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usersAPI } from '../../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({
    role: 'all',
    department: 'all',
    status: 'all',
    search: ''
  });
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      // Filter out reporters and current user
      const nonReporters = response.data.filter(u => 
        u.role !== 'reporter' && u._id !== user.id
      );
      setUsers(nonReporters);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = () => {
    let filtered = [...users];

    if (filters.role !== 'all') {
      filtered = filtered.filter(u => u.role === filters.role);
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(u => u.department === filters.department);
    }

    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(u => u.isActive);
      } else {
        filtered = filtered.filter(u => !u.isActive);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(u =>
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditClick = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditData({
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      email: userToEdit.email,
      role: userToEdit.role,
      department: userToEdit.department,
      isActive: userToEdit.isActive
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await usersAPI.update(editingUser._id, editData);
      showSuccess('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Failed to update user');
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to deactivate ${userName}?`)) {
      return;
    }

    try {
      await usersAPI.delete(userId);
      showSuccess('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Failed to deactivate user');
    }
  };

  const canEditUser = (targetUser) => {
    if (user.role === 'admin') return true;
    if (user.role === 'team-lead' && targetUser.role === 'it-support') return true;
    return false;
  };

  const canDeactivateUser = (targetUser) => {
    if (user.role === 'admin') return true;
    return false;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const roleOptions = [
    { value: 'it-support', label: 'IT Support' },
    { value: 'team-lead', label: 'Team Lead' },
    { value: 'admin', label: 'Administrator' }
  ];

  const departments = [
    'IT Support',
    'Network Operations',
    'Security',
    'Development',
    'Infrastructure',
    'IT Management'
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage IT staff roles and permissions</p>
      </div>

      {/* Filters */}
      <div className="user-filters">
        <div className="filters-row">
          <div className="search-group">
            <div className="search-input-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="form-select"
            >
              <option value="all">All Roles</option>
              <option value="it-support">IT Support</option>
              <option value="team-lead">Team Lead</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="form-select"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="results-summary">
          <span>{filteredUsers.length} users found</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(userItem => (
              <tr key={userItem._id} className={!userItem.isActive ? 'inactive-user' : ''}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {userItem.firstName[0]}{userItem.lastName[0]}
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {userItem.firstName} {userItem.lastName}
                      </div>
                      <div className="user-email">{userItem.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${userItem.role}`}>
                    {userItem.role.replace('-', ' ').toUpperCase()}
                  </span>
                </td>
                <td>{userItem.department}</td>
                <td>
                  <span className={`status-badge ${userItem.isActive ? 'active' : 'inactive'}`}>
                    {userItem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{formatLastLogin(userItem.lastLogin)}</td>
                <td>
                  <div className="action-buttons">
                    {canEditUser(userItem) && (
                      <button
                        onClick={() => handleEditClick(userItem)}
                        className="btn btn-sm btn-outline"
                        title="Edit User"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {canDeactivateUser(userItem) && userItem.isActive && (
                      <button
                        onClick={() => handleDeactivateUser(userItem._id, `${userItem.firstName} ${userItem.lastName}`)}
                        className="btn btn-sm btn-danger"
                        title="Deactivate User"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3>No users found</h3>
            <p>No users match your current filters.</p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="modal-close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleEditSubmit} className="edit-user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleEditChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleEditChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={editData.role}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="department" className="form-label">Department</label>
                    <select
                      id="department"
                      name="department"
                      value={editData.department}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={editData.isActive}
                      onChange={handleEditChange}
                    />
                    <span className="checkbox-custom"></span>
                    Active User
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
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

export default UserManagement;