import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      roles: ['reporter', 'it-support', 'team-lead', 'admin']
    },
    {
      name: 'Report Incident',
      href: '/incidents/report',
      icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
      roles: ['reporter', 'it-support', 'team-lead', 'admin']
    },
    {
      name: 'Incident Status',
      href: '/incidents/status',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      roles: ['reporter', 'it-support', 'team-lead', 'admin']
    },
    {
      name: 'Resolve Cases',
      href: '/incidents/resolve',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      roles: ['it-support', 'team-lead', 'admin']
    },
    {
      name: 'Allocate Cases',
      href: '/incidents/allocate',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      roles: ['team-lead', 'admin']
    },
    {
      name: 'Manage Users',
      href: '/users/manage',
      icon: 'M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
      roles: ['team-lead', 'admin']
    }
  ];

  const userCanAccess = (allowedRoles) => {
    return allowedRoles.includes(user?.role);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigation.map((item) => {
            if (!userCanAccess(item.roles)) return null;
            
            return (
              <li key={item.name} className="nav-item">
                <NavLink
                  to={item.href}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <svg
                    className="nav-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d={item.icon} />
                  </svg>
                  {!collapsed && (
                    <span className="nav-text">{item.name}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className="profile-link">
          <div className="profile-avatar">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="profile-info">
              <div className="profile-name">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="profile-role">
                {user?.role?.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;