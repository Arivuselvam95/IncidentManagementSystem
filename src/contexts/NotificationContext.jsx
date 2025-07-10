import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
      } catch (error) {
        console.error('Error loading saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      setSocket(newSocket);

      newSocket.on('notification', (notification) => {
        addNotification(notification);
      });

      return () => {
        newSocket.close();
      };
    }
  }, []);

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      ...notification,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto remove after 5 seconds for success notifications
    if (notification.type === 'success') {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const showSuccess = (message, title = 'Success') => {
    addNotification({ type: 'success', title, message, read: false });
  };

  const showError = (message, title = 'Error') => {
    addNotification({ type: 'error', title, message, read: false });
  };

  const showWarning = (message, title = 'Warning') => {
    addNotification({ type: 'warning', title, message, read: false });
  };

  const showInfo = (message, title = 'Information') => {
    addNotification({ type: 'info', title, message, read: false });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    markAsRead,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    socket
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};