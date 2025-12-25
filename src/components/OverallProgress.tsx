/**
 * OverallProgress - Aggregate transfer progress display
 */

import type { OverallProgress as OverallProgressType } from '../types';
import { formatBytes, formatSpeed, formatTimeRemaining } from '../utils/format';

interface OverallProgressProps {
  progress: OverallProgressType;
  className?: string;
}

export function OverallProgress({ progress, className = '' }: OverallProgressProps) {
  const {
    totalFiles,
    completedFiles,
    totalBytes,
    transferredBytes,
    overallSpeedBps,
    estimatedTimeRemaining,
    progress: percent,
  } = progress;

  const isComplete = completedFiles === totalFiles;

  return (
    <div className={`card card-elevated glass ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {isComplete ? 'Transfer Complete!' : 'Transferring...'}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {completedFiles} of {totalFiles} files
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold gradient-text">
            {percent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar h-3 mb-4">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wide">Size</p>
          <p className="font-medium">
            {formatBytes(transferredBytes)} / {formatBytes(totalBytes)}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wide">Speed</p>
          <p className="font-medium">{formatSpeed(overallSpeedBps)}</p>
        </div>
        <div>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wide">ETA</p>
          <p className="font-medium">
            {isComplete ? 'Done!' : formatTimeRemaining(estimatedTimeRemaining).replace(' remaining', '')}
          </p>
        </div>
      </div>
    </div>
  );
}
