interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  size = 'md',
  showPercentage = false,
  className = '',
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4',
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`progress-track ${sizeStyles[size]}`}>
        <div
          className={`progress-fill ${animated ? 'transition-all duration-300' : ''}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-sm text-surface-400 text-right">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
}

interface FileProgressProps {
  fileName: string;
  progress: number;
  speed?: string;
  status: 'pending' | 'transferring' | 'complete' | 'error';
  className?: string;
}

export function FileProgress({
  fileName,
  progress,
  speed,
  status,
  className = '',
}: FileProgressProps) {
  const statusColors = {
    pending: 'text-surface-400',
    transferring: 'text-primary-400',
    complete: 'text-success-400',
    error: 'text-error-400',
  };
  
  const statusLabels = {
    pending: 'Waiting...',
    transferring: speed || 'Transferring...',
    complete: 'Complete',
    error: 'Failed',
  };
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-200 truncate max-w-[60%]">{fileName}</span>
        <span className={statusColors[status]}>{statusLabels[status]}</span>
      </div>
      <ProgressBar progress={progress} size="sm" />
    </div>
  );
}
