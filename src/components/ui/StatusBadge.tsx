import { Wifi, WifiOff, Loader2, Check, AlertCircle } from 'lucide-react';
import type { ConnectionStatus } from '../../types';

interface StatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
  showLabel?: boolean;
}

interface StatusConfig {
  icon: typeof Wifi;
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  animate?: boolean;
  pulse?: boolean;
}

export function StatusBadge({ status, className = '', showLabel = true }: StatusBadgeProps) {
  const statusConfig: Record<ConnectionStatus, StatusConfig> = {
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      bgColor: 'bg-surface-700',
      textColor: 'text-surface-400',
      dotColor: 'bg-surface-500',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      bgColor: 'bg-primary-900/50',
      textColor: 'text-primary-300',
      dotColor: 'bg-primary-400',
      animate: true,
    },
    waiting: {
      icon: Wifi,
      label: 'Waiting for peer',
      bgColor: 'bg-warning-900/50',
      textColor: 'text-warning-300',
      dotColor: 'bg-warning-400',
      pulse: true,
    },
    connected: {
      icon: Check,
      label: 'Connected',
      bgColor: 'bg-success-900/50',
      textColor: 'text-success-300',
      dotColor: 'bg-success-400',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      bgColor: 'bg-error-900/50',
      textColor: 'text-error-300',
      dotColor: 'bg-error-400',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgColor} ${config.textColor}
        text-sm font-medium
        ${className}
      `}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`
            absolute inline-flex h-full w-full rounded-full ${config.dotColor}
            ${config.pulse ? 'animate-ping opacity-75' : ''}
          `}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </span>
      
      {config.animate ? (
        <Icon className="w-4 h-4 spinner" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
