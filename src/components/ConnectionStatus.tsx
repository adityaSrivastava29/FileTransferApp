/**
 * ConnectionStatus - Visual indicator for connection state
 */

import type { ConnectionState } from '../types';

interface ConnectionStatusProps {
  state: ConnectionState;
  remotePeerId?: string | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

const stateConfig: Record<ConnectionState, { label: string; colorClass: string; animate: boolean }> = {
  idle: { label: 'Ready to connect', colorClass: 'status-connected', animate: false }, // Green to show it's ready
  connecting: { label: 'Connecting...', colorClass: 'status-connecting', animate: true },
  connected: { label: 'Connected!', colorClass: 'status-connected', animate: false },
  transferring: { label: 'Transferring...', colorClass: 'status-connected', animate: true },
  completed: { label: 'Completed!', colorClass: 'status-connected', animate: false },
  error: { label: 'Connection Error', colorClass: 'status-error', animate: false },
};

export function ConnectionStatus({
  state,
  remotePeerId,
  error,
  onRetry,
  className = '',
}: ConnectionStatusProps) {
  const config = stateConfig[state];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`status-indicator ${config.colorClass}`} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>

      {state === 'connected' && remotePeerId && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Connected to: <span className="font-mono">{remotePeerId}</span>
        </p>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-2 mt-2">
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          {onRetry && (
            <button onClick={onRetry} className="btn btn-secondary text-sm py-2 px-4">
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
