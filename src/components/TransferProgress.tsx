import { X, CheckCircle, Loader2 } from 'lucide-react';
import { ProgressBar, FileProgress } from './ui/ProgressBar';
import { Button } from './ui/Button';
import type { TransferSession } from '../types';
import { formatFileSize, formatSpeed, formatTimeRemaining } from '../utils/fileUtils';

interface TransferProgressProps {
  session: TransferSession;
  onCancel?: () => void;
  className?: string;
}

export function TransferProgress({ session, onCancel, className = '' }: TransferProgressProps) {
  const isComplete = session.status === 'complete';
  const isError = session.status === 'error';
  const isCancelled = session.status === 'cancelled';
  const isActive = session.status === 'in-progress';
  
  // Calculate overall stats
  let totalBytes = 0;
  let transferredBytes = 0;
  let currentSpeed = 0;
  
  session.progress.forEach((progress) => {
    totalBytes += progress.totalBytes;
    transferredBytes += progress.bytesTransferred;
    if (progress.status === 'transferring') {
      currentSpeed += progress.speed;
    }
  });
  
  const timeRemaining = currentSpeed > 0 
    ? (totalBytes - transferredBytes) / currentSpeed 
    : 0;
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-success-400" />
            ) : isActive ? (
              <Loader2 className="w-6 h-6 text-primary-400 spinner" />
            ) : null}
            
            <div>
              <h3 className="text-lg font-semibold text-surface-100">
                {isComplete ? 'Transfer Complete!' : 
                 isError ? 'Transfer Failed' :
                 isCancelled ? 'Transfer Cancelled' :
                 session.direction === 'send' ? 'Sending Files...' : 'Receiving Files...'}
              </h3>
              <p className="text-sm text-surface-400">
                {session.files.length} file{session.files.length !== 1 ? 's' : ''} •{' '}
                {formatFileSize(transferredBytes)} / {formatFileSize(totalBytes)}
              </p>
            </div>
          </div>
          
          {isActive && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              icon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
          )}
        </div>
        
        <ProgressBar
          progress={session.overallProgress}
          size="lg"
          showPercentage
        />
        
        {isActive && currentSpeed > 0 && (
          <div className="flex items-center justify-between text-sm text-surface-400">
            <span>{formatSpeed(currentSpeed)}</span>
            <span>~{formatTimeRemaining(timeRemaining)} remaining</span>
          </div>
        )}
      </div>
      
      {/* Individual file progress */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-surface-300">Files</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {session.files.map((file) => {
            const progress = session.progress.get(file.id);
            
            return (
              <FileProgress
                key={file.id}
                fileName={file.name}
                progress={progress?.percentage ?? 0}
                speed={progress?.speed ? formatSpeed(progress.speed) : undefined}
                status={progress?.status === 'cancelled' ? 'error' : (progress?.status ?? 'pending')}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
