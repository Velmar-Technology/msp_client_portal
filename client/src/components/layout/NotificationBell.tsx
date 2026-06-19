import { useState, useEffect, useRef } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, Check, Ticket, MessageSquare, ShieldAlert, CheckSquare, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    fetchNotifications,
  } = useNotificationStore();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (id: string, link: string | null) => {
    setIsOpen(false);
    await markAsRead(id);
    if (link) {
      navigate(link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED':
        return {
          bg: 'bg-tertiary/10',
          text: 'text-tertiary',
          Icon: Ticket,
        };
      case 'TICKET_ASSIGNED':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          Icon: CheckSquare,
        };
      case 'TICKET_STATUS_CHANGED':
      case 'TICKET_CANCELLED':
        return {
          bg: 'bg-info/10',
          text: 'text-info',
          Icon: ShieldAlert,
        };
      case 'NEW_REPLY':
        return {
          bg: 'bg-secondary/10',
          text: 'text-secondary',
          Icon: MessageSquare,
        };
      default:
        return {
          bg: 'bg-primary/10',
          text: 'text-primary',
          Icon: Bell,
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications(); // Refresh notifications list on open
          }
        }}
        className="relative p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer"
        aria-label="Toggle notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 md:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl py-1 animate-fade-in z-50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <h3 className="text-label-md font-bold text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-secondary hover:bg-secondary/10 rounded-md transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" />
                  <span>Read all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearNotifications()}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-error/80 hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
              <button
                onClick={() => fetchNotifications()}
                className="p-1 text-on-surface-variant/75 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                title="Refresh notifications"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-3">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-label-md text-on-surface font-semibold">All caught up!</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const conf = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif.id, notif.link)}
                    className={`flex gap-3 p-4 hover:bg-surface-container-low transition-colors cursor-pointer relative ${!notif.read ? 'bg-surface-container-low/30' : ''}`}
                  >
                    {/* Icon container */}
                    <div className={`w-8 h-8 rounded-lg ${conf.bg} ${conf.text} flex items-center justify-center shrink-0 mt-0.5`}>
                      <conf.Icon className="h-4.5 w-4.5" />
                    </div>

                    {/* Content text */}
                    <div className="flex-1 pr-2">
                      <p className={`text-body-sm text-on-surface leading-tight ${!notif.read ? 'font-semibold' : ''}`}>
                        {notif.title}
                      </p>
                      <p className="text-[12px] text-on-surface-variant leading-snug mt-1">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-on-surface-variant/60 block mt-1.5">
                        {formatDistanceToNow(notif.created_at)}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.read && (
                      <span className="absolute top-4 right-4 w-2 h-2 bg-secondary rounded-full shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Manage Preferences link */}
          <div className="border-t border-outline-variant">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications/preferences');
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-[11px] font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50 transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Manage Preferences</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
