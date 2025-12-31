import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useTransferStore } from '../../store/transferStore';
import type { Toast as ToastType } from '../../store/transferStore';

export function ToastContainer() {
  const { toasts, removeToast } = useTransferStore();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  );
}

interface ToastProps extends ToastType {
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, onClose }: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-900/90',
      borderColor: 'border-success-500/50',
      iconColor: 'text-success-400',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-error-900/90',
      borderColor: 'border-error-500/50',
      iconColor: 'text-error-400',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-900/90',
      borderColor: 'border-warning-500/50',
      iconColor: 'text-warning-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-primary-900/90',
      borderColor: 'border-primary-500/50',
      iconColor: 'text-primary-400',
    },
  };
  
  const { icon: Icon, bgColor, borderColor, iconColor } = config[type];
  
  return (
    <div
      className={`
        toast-enter
        flex items-start gap-3 p-4 rounded-xl
        ${bgColor} backdrop-blur-sm
        border ${borderColor}
        shadow-lg
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <p className="text-surface-100 text-sm flex-1">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-surface-400 hover:text-surface-200 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
