import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI } from '../../services/api';
import IncidentCard from './IncidentCard';
import IncidentFilters from './IncidentFilters';
import './Incidents.css';

const IncidentStatus = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    category: 'all',
    assignee: 'all',
    search: '',
    dateRange: '30d',
    showHidden: false
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [incidents, filters, sortBy, sortOrder]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentsAPI.getAll();
      setIncidents(response.data.incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      // Use mock data for demonstration
      setIncidents(getMockIncidents());
    } finally {
      setLoading(false);
    }
  };

  const getMockIncidents = () => [
    {
      id: 'INC-001',
      title: 'Email server connectivity issues',
      description: 'Users unable to send/receive emails since 9:00 AM',
      severity: 'critical',
      status: 'open',
      category: 'Email & Communication',
      assignee: { name: 'John Doe', id: 'user1' },
      reporter: { name: 'Alice Smith', email: 'alice@company.com' },
      createdAt: '2024-01-07T09:00:00Z',
      updatedAt: '2024-01-07T09:30:00Z',
      slaTarget: '2024-01-07T10:00:00Z',
      affectedServices: 'Exchange Server, Outlook',
      comments: 3,
      attachments: 2,
      isHidden: false
    },
    {
      id: 'INC-002',
      title: 'Website loading slowly',
      description: 'Company website taking 30+ seconds to load',
      severity: 'medium',
      status: 'in-progress',
      category: 'Website & Web Services',
      assignee: { name: 'Jane Wilson', id: 'user2' },
      reporter: { name: 'Bob Johnson', email: 'bob@company.com' },
      createdAt: '2024-01-07T08:30:00Z',
      updatedAt: '2024-01-07T10:15:00Z',
      slaTarget: '2024-01-08T08:30:00Z',
      affectedServices: 'Public Website',
      comments: 5,
      attachments: 1,
      isHidden: false
    },
    {
      id: 'INC-003',
      title: 'Printer not working on 3rd floor',
      description: 'HP LaserJet printer showing error messages',
      severity: 'low',
      status: 'assigned',
      category: 'Printer & Peripherals',
      assignee: { name: 'Mike Davis', id: 'user3' },
      reporter: { name: 'Carol White', email: 'carol@company.com' },
      createdAt: '2024-01-06T14:20:00Z',
      updatedAt: '2024-01-07T09:00:00Z',
      slaTarget: '2024-01-09T14:20:00Z',
      affectedServices: 'HP LaserJet Pro 3rd Floor',
      comments: 2,
      attachments: 0,
      isHidden: false
    },
    {
      id: 'INC-004',
      title: 'Database connection timeout',
      description: 'CRM system unable to connect to database',
      severity: 'high',
      status: 'resolved',
      category: 'Database & Storage',
      assignee: { name: 'Sarah Brown', id: 'user4' },
      reporter: { name: 'David Lee', email: 'david@company.com' },
      createdAt: '2024-01-05T11:15:00Z',
      updatedAt: '2024-01-05T15:30:00Z',
      resolvedAt: '2024-01-05T15:30:00Z',
      slaTarget: '2024-01-05T15:15:00Z',
      affectedServices: 'CRM Database',
      comments: 8,
      attachments: 3,
      isHidden: false
    }
  ];

  const applyFilters = () => {
    let filtered = [...incidents];

    // Filter by visibility
    if (!filters.showHidden) {
      filtered = filtered.filter(incident => !incident.isHidden);
    }

    // Apply other filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(incident => incident.status === filters.status);
    }

    if (filters.severity !== 'all') {
      filtered = filtered.filter(incident => incident.severity === filters.severity);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(incident => incident.category === filters.category);
    }

    if (filters.assignee !== 'all') {
      if (filters.assignee === 'me') {
        filtered = filtered.filter(incident => incident.assignee?.id === user.id);
      } else if (filters.assignee === 'unassigned') {
        filtered = filtered.filter(incident => !incident.assignee);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchLower) ||
        incident.description.toLowerCase().includes(searchLower) ||
        incident.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(filters.dateRange);
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      
      filtered = filtered.filter(incident => 
        new Date(incident.createdAt) >= cutoffDate
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      } else if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredIncidents(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleHideIncident = async (incidentId) => {
    try {
      await incidentsAPI.update(incidentId, { isHidden: true });
      
      // Update local state
      setIncidents(prev => 
        prev.map(incident => 
          incident.id === incidentId 
            ? { ...incident, isHidden: true }
            : incident
        )
      );
      
      showSuccess('Incident hidden from view');
    } catch (error) {
      console.error('Error hiding incident:', error);
      showError('Failed to hide incident');
    }
  };

  const handleUnhideIncident = async (incidentId) => {
    try {
      await incidentsAPI.update(incidentId, { isHidden: false });
      
      // Update local state
      setIncidents(prev => 
        prev.map(incident => 
          incident.id === incidentId 
            ? { ...incident, isHidden: false }
            : incident
        )
      );
      
      showSuccess('Incident restored to view');
    } catch (error) {
      console.error('Error unhiding incident:', error);
      showError('Failed to restore incident');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      );
    }
    
    if (sortOrder === 'asc') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 15l4-4 4 4" />
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 9l-4 4-4-4" />
        </svg>
      );
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
    <div className="incident-status">
      <div className="page-header">
        <h1>Incident Status</h1>
        <p>Track and manage all incidents across your organization.</p>
      </div>

      <IncidentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCount={incidents.length}
        filteredCount={filteredIncidents.length}
        showHiddenToggle={true}
      />

      <div className="incidents-content">
        <div className="incidents-header">
          <div className="incidents-count">
            <span className="count-number">{filteredIncidents.length}</span>
            <span className="count-label">incidents found</span>
          </div>

          <div className="sort-controls">
            <label htmlFor="sortBy">Sort by:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select sort-select"
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Last Updated</option>
              <option value="severity">Severity</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-direction-btn"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {getSortIcon(sortBy)}
            </button>
          </div>
        </div>

        <div className="incidents-grid">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident,index) => (
              <IncidentCard
                id={index}
                key={incident._id}
                incident={incident}
                onUpdate={fetchIncidents}
                onHide={handleHideIncident}
                onUnhide={handleUnhideIncident}
                showHideOption={true}
              />
            ))
          ) : (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
              </svg>
              <h3>No incidents found</h3>
              <p>No incidents match your current filters. Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentStatus;