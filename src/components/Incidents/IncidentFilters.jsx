import { useState } from 'react';
import './Incidents.css';

const IncidentFilters = ({ filters, onFilterChange, totalCount, filteredCount, showHiddenToggle = false }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      severity: 'all',
      category: 'all',
      assignee: 'all',
      search: '',
      dateRange: '30d',
      showHidden: false
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.severity !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.assignee !== 'all') count++;
    if (filters.search) count++;
    if (filters.dateRange !== '30d') count++;
    if (filters.showHidden) count++;
    return count;
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const severityOptions = [
    { value: 'all', label: 'All Severity' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Network & Connectivity', label: 'Network & Connectivity' },
    { value: 'Software & Applications', label: 'Software & Applications' },
    { value: 'Hardware & Equipment', label: 'Hardware & Equipment' },
    { value: 'Security & Access', label: 'Security & Access' },
    { value: 'Database & Storage', label: 'Database & Storage' },
    { value: 'Email & Communication', label: 'Email & Communication' },
    { value: 'Printer & Peripherals', label: 'Printer & Peripherals' },
    { value: 'Phone & VoIP', label: 'Phone & VoIP' },
    { value: 'Website & Web Services', label: 'Website & Web Services' },
    { value: 'Mobile & Tablets', label: 'Mobile & Tablets' },
    { value: 'Other', label: 'Other' }
  ];

  const assigneeOptions = [
    { value: 'all', label: 'All Assignees' },
    { value: 'me', label: 'Assigned to Me' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '1', label: 'Today' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 3 months' }
  ];

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="incident-filters">
      <div className="filters-header">
        <div className="filters-title">
          <h3>Filters</h3>
          {activeFilterCount > 0 && (
            <span className="active-filters-count">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="filters-actions">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn btn-sm btn-outline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
            </svg>
            {showAdvanced ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="btn btn-sm"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="filters-content">
        {/* Quick Search */}
        <div className="search-section">
          <div className="search-input-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search incidents by title, description, or ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
            {filters.search && (
              <button
                onClick={() => handleFilterChange('search', '')}
                className="search-clear"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="quick-filters">
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select filter-select"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="form-select filter-select"
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.assignee}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
              className="form-select filter-select"
            >
              {assigneeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="form-select filter-select"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {showHiddenToggle && (
            <div className="filter-group">
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={filters.showHidden}
                  onChange={(e) => handleFilterChange('showHidden', e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                Show Hidden
              </label>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="form-select"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="filters-summary">
        <span className="results-text">
          Showing {filteredCount} of {totalCount} incidents
        </span>
        
        {filteredCount !== totalCount && (
          <span className="filter-indicator">
            (filtered)
          </span>
        )}
      </div>
    </div>
  );
};

export default IncidentFilters;