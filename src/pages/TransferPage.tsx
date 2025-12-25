/**
 * TransferPage - Active file transfer display
 */

import { useEffect } from 'react';
import { FileProgress } from '../components/FileProgress';
import { OverallProgress } from '../components/OverallProgress';
import { useTransfer } from '../hooks/useTransfer';
import { useWakeLock } from '../hooks/useWakeLock';
import type { TransferRole } from '../types';

interface TransferPageProps {
  files?: File[];
  role: TransferRole;
  onComplete: () => void;
  onCancel: () => void;
}

export function TransferPage({ files, role, onComplete, onCancel }: TransferPageProps) {
  const { transfers, overallProgress, sendFiles, cancelAll } = useTransfer();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  // Start transfer and wake lock
  useEffect(() => {
    requestWakeLock();
    
    if (role === 'sender' && files && files.length > 0) {
      sendFiles(files).catch(console.error);
    }
    
    return () => {
      releaseWakeLock();
    };
  }, [files, role, sendFiles, requestWakeLock, releaseWakeLock]);

  // Check for completion
  useEffect(() => {
    if (overallProgress && overallProgress.completedFiles === overallProgress.totalFiles && overallProgress.totalFiles > 0) {
      // Small delay before navigating to completion
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [overallProgress, onComplete]);

  const handleCancel = () => {
    cancelAll();
    onCancel();
  };

  return (
    <div className="page animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          {role === 'sender' ? 'Sending...' : 'Receiving...'}
        </h1>
        <button
          onClick={handleCancel}
          className="btn btn-ghost text-red-400 hover:text-red-300"
        >
          Cancel
        </button>
      </div>

      {/* Overall progress */}
      {overallProgress && (
        <OverallProgress progress={overallProgress} className="mb-6" />
      )}

      {/* Per-file progress */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              {role === 'sender' ? 'Preparing files...' : 'Waiting for files...'}
            </p>
          </div>
        ) : (
          transfers.map((progress) => (
            <FileProgress key={progress.fileId} progress={progress} />
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-auto pt-6 text-center text-sm text-[var(--color-text-muted)]">
        <p>Keep the app open during transfer</p>
      </div>
    </div>
  );
}
