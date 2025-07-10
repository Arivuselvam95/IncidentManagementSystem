import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose }) => {
  const { notifications, removeNotification, markAsRead, clearAllNotifications } = useNotifications();

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type) => {
    const icons = {
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[type] || icons.info;
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const recentNotifications = notifications.slice(0, 15);

  return (
    <div className="notification-dropdown">
      <div className="notification-dropdown-header">
        <h3>Notifications</h3>
        <div className="notification-dropdown-actions">
          {notifications.length > 0 && (
            <button 
              onClick={clearAllNotifications}
              className="clear-all-btn"
              title="Clear all notifications"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="notification-dropdown-body">
        {recentNotifications.length === 0 ? (
          <div className="no-notifications">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p>No notifications</p>
          </div>
        ) : (
          <div className="notification-list">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-dropdown-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`notification-dropdown-icon notification-${notification.type}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={getNotificationIcon(notification.type)} />
                  </svg>
                </div>
                
                <div className="notification-dropdown-content">
                  <div className="notification-dropdown-title">
                    {notification.title}
                  </div>
                  <div className="notification-dropdown-message">
                    {notification.message}
                  </div>
                  <div className="notification-dropdown-time">
                    {formatTime(notification.timestamp)}
                  </div>
                </div>
                
                <button
                  className="notification-dropdown-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  title="Remove notification"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 15 && (
        <div className="notification-dropdown-footer">
          <button className="view-all-btn">
            View All Notifications ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;