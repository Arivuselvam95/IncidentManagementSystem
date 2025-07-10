import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { notifications, removeNotification, markAsRead, clearAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

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

  if (notifications.length === 0) return null;

  return (
    <>
      {/* Floating notifications */}
      <div className="notification-stack">
        {notifications.filter(n => !n.read).slice(0, 3).map((notification) => (
          <div
            key={notification.id}
            className={`notification-toast notification-${notification.type}`}
          >
            <div className="notification-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={getNotificationIcon(notification.type)} />
              </svg>
            </div>
            
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">{formatTime(notification.timestamp)}</div>
            </div>
            
            <button
              className="notification-close"
              onClick={() => markAsRead(notification.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Notification center panel (for future implementation) */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            <div className="notification-panel-actions">
              <button onClick={clearAllNotifications} className="btn btn-sm">
                Clear All
              </button>
              <button onClick={() => setIsOpen(false)} className="btn btn-sm">
                Close
              </button>
            </div>
          </div>
          
          <div className="notification-panel-body">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={getNotificationIcon(notification.type)} />
                  </svg>
                </div>
                
                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">{formatTime(notification.timestamp)}</div>
                </div>
                
                <button
                  className="notification-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;