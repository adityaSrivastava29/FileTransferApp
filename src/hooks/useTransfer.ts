/**
 * useTransfer - React hook for file transfer management
 * Provides throttled progress updates to avoid React re-render jank
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { transferManager } from '../services/TransferManager';
import type { TransferProgress, OverallProgress, TransferFile } from '../types';

interface UseTransferReturn {
  transfers: TransferProgress[];
  overallProgress: OverallProgress | null;
  receivedFiles: TransferFile[];
  isTransferring: boolean;
  sendFiles: (files: File[]) => Promise<void>;
  pauseTransfer: (fileId: string) => void;
  resumeTransfer: (fileId: string) => void;
  cancelAll: () => void;
  reset: () => void;
}

export function useTransfer(): UseTransferReturn {
  const [transfers, setTransfers] = useState<Map<string, TransferProgress>>(new Map());
  const [receivedFiles, setReceivedFiles] = useState<TransferFile[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  // Set up callbacks on mount
  useEffect(() => {
    transferManager.onProgress((progress) => {
      setTransfers(prev => {
        const next = new Map(prev);
        next.set(progress.fileId, progress);
        return next;
      });
    });

    transferManager.onFileReceived((file) => {
      setReceivedFiles(prev => [...prev, file]);
    });

    transferManager.onTransferComplete(() => {
      setIsTransferring(false);
    });

    transferManager.onError((error, fileId) => {
      console.error('Transfer error:', error, fileId);
      if (fileId) {
        setTransfers(prev => {
          const next = new Map(prev);
          const existing = next.get(fileId);
          if (existing) {
            next.set(fileId, { ...existing, state: 'failed' });
          }
          return next;
        });
      }
    });
  }, []);

  // Calculate overall progress
  const overallProgress = useMemo((): OverallProgress | null => {
    const transferArray = Array.from(transfers.values());
    if (transferArray.length === 0) return null;

    const totalFiles = transferArray.length;
    const completedFiles = transferArray.filter(t => t.state === 'completed').length;
    const totalBytes = transferArray.reduce((sum, t) => sum + t.totalBytes, 0);
    const transferredBytes = transferArray.reduce((sum, t) => sum + t.bytesTransferred, 0);
    const overallSpeedBps = transferArray.reduce((sum, t) => sum + t.speedBps, 0);
    const remainingBytes = totalBytes - transferredBytes;
    const estimatedTimeRemaining = overallSpeedBps > 0 ? remainingBytes / overallSpeedBps : Infinity;
    const progress = totalBytes > 0 ? (transferredBytes / totalBytes) * 100 : 0;

    return {
      totalFiles,
      completedFiles,
      totalBytes,
      transferredBytes,
      overallSpeedBps,
      estimatedTimeRemaining,
      progress,
    };
  }, [transfers]);

  const sendFiles = useCallback(async (files: File[]): Promise<void> => {
    setIsTransferring(true);
    setTransfers(new Map());
    await transferManager.sendFiles(files);
  }, []);

  const pauseTransfer = useCallback((fileId: string) => {
    transferManager.pauseTransfer(fileId);
  }, []);

  const resumeTransfer = useCallback((fileId: string) => {
    transferManager.resumeTransfer(fileId);
  }, []);

  const cancelAll = useCallback(() => {
    transferManager.cancelAll();
    setIsTransferring(false);
    setTransfers(new Map());
  }, []);

  const reset = useCallback(() => {
    transferManager.reset();
    setTransfers(new Map());
    setReceivedFiles([]);
    setIsTransferring(false);
  }, []);

  return {
    transfers: Array.from(transfers.values()),
    overallProgress,
    receivedFiles,
    isTransferring,
    sendFiles,
    pauseTransfer,
    resumeTransfer,
    cancelAll,
    reset,
  };
}
