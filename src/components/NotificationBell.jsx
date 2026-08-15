import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'join_request': return '';
      case 'request_accepted': return '';
      case 'request_declined': return '';
      case 'team_locked': return '';
      case 'team_verified': return '';
      default: return '';
    }
  };

  return (
    <div className="notification-bell"ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className="bell-icon"></span>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="mark-all-read"onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              <p> No notifications yet</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => {
                  if (!notif.is_read) markAsRead(notif.id);
                }}
              >
                <div className="notif-title">
                  {getNotifIcon(notif.type)} {notif.title}
                </div>
                <div className="notif-message">{notif.message}</div>
                <div className="notif-time">{formatTime(notif.created_at)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
