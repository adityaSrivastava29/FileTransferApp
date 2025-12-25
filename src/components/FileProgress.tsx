/**
 * FileProgress - Individual file transfer progress display
 */

import type { TransferProgress } from '../types';
import { formatBytes, formatSpeed, formatTimeRemaining, truncateFilename } from '../utils/format';

interface FileProgressProps {
  progress: TransferProgress;
  className?: string;
}

export function FileProgress({ progress, className = '' }: FileProgressProps) {
  const {
    fileName,
    fileSize,
    bytesTransferred,
    speedBps,
    estimatedTimeRemaining,
    state,
    progress: percent,
  } = progress;

  const isCompleted = state === 'completed';
  const isFailed = state === 'failed';
  const isActive = state === 'sending' || state === 'receiving';

  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" title={fileName}>
            {truncateFilename(fileName, 30)}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatBytes(bytesTransferred)} / {formatBytes(fileSize)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isCompleted && (
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isFailed && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-2">
        <div
          className={`progress-bar-fill ${isFailed ? '!bg-red-500' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
        <span>
          {isActive && formatSpeed(speedBps)}
          {isCompleted && 'Complete'}
          {isFailed && 'Failed'}
          {state === 'queued' && 'Waiting...'}
        </span>
        <span>
          {isActive && formatTimeRemaining(estimatedTimeRemaining)}
          {isCompleted && '✓'}
        </span>
      </div>
    </div>
  );
}
