import { useNotificationStore } from '../../store/useNotificationStore';
import type { ToastMessage } from '../../store/useNotificationStore';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useNotificationStore((state) => state.removeToast);
  const navigate = useNavigate();

  // Pick type styles & icon
  const styles = {
    success: {
      border: 'border-tertiary/30',
      iconColor: 'text-tertiary',
      Icon: CheckCircle,
      bg: 'bg-surface-container-lowest/90 border-l-4 border-l-tertiary',
    },
    warning: {
      border: 'border-warning/30',
      iconColor: 'text-warning',
      Icon: AlertTriangle,
      bg: 'bg-surface-container-lowest/90 border-l-4 border-l-warning',
    },
    error: {
      border: 'border-error/30',
      iconColor: 'text-error',
      Icon: AlertCircle,
      bg: 'bg-surface-container-lowest/90 border-l-4 border-l-error',
    },
    info: {
      border: 'border-info/30',
      iconColor: 'text-info',
      Icon: Info,
      bg: 'bg-surface-container-lowest/90 border-l-4 border-l-info',
    },
  }[toast.type] || {
    border: 'border-outline-variant',
    iconColor: 'text-primary',
    Icon: Info,
    bg: 'bg-surface-container-lowest/90 border-l-4 border-l-primary',
  };

  const handleClick = () => {
    if (toast.link) {
      navigate(toast.link);
    }
    removeToast(toast.id);
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 w-80 rounded-xl shadow-lg border border-outline-variant backdrop-blur-md transition-all duration-300 animate-slide-in relative overflow-hidden ${styles.bg} ${toast.link ? 'cursor-pointer hover:shadow-xl hover:translate-y-[-2px]' : ''}`}
      onClick={toast.link ? handleClick : undefined}
    >
      <div className={`${styles.iconColor} shrink-0 mt-0.5`}>
        <styles.Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 pr-6">
        <h4 className="text-label-md font-bold text-on-surface line-clamp-1">{toast.title}</h4>
        <p className="text-body-sm text-on-surface-variant mt-1 leading-normal line-clamp-3">
          {toast.message}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation(); // Avoid triggering navigation if clicked link
          removeToast(toast.id);
        }}
        className="absolute top-3 right-3 p-1 rounded-full text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar effect indicating auto-dismiss */}
      <div className="absolute bottom-0 left-0 h-1 bg-surface-container-highest w-full opacity-30">
        <div className="h-full bg-current animate-pulse w-full duration-[6000ms]" />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useNotificationStore((state) => state.toasts);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
