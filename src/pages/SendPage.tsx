/**
 * SendPage - QR Scanner and file picker for sender
 */

import { useState, useCallback, useEffect } from 'react';
import { QRScanner } from '../components/QRScanner';
import { FilePicker } from '../components/FilePicker';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { usePeer } from '../hooks/usePeer';
import type { ConnectionState } from '../types';

interface SendPageProps {
  onStartTransfer: (files: File[]) => void;
  onBack: () => void;
}

export function SendPage({ onStartTransfer, onBack }: SendPageProps) {
  const { connectionState, error, isConnected, initialize, connect, reset } = usePeer();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  // Initialize peer on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleScan = useCallback(async (scannedPeerId: string) => {
    setScanComplete(true);
    try {
      await connect(scannedPeerId);
    } catch {
      // Error handled by usePeer
    }
  }, [connect]);

  const handleScanError = useCallback((err: string) => {
    console.error('Scan error:', err);
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleStartTransfer = () => {
    if (selectedFiles.length > 0 && isConnected) {
      onStartTransfer(selectedFiles);
    }
  };

  const handleRetry = async () => {
    setScanComplete(false);
    await reset();
  };

  return (
    <div className="page animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="btn btn-ghost p-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Send Files</h1>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Scanner or Connection Status */}
        {!isConnected && !scanComplete && (
          <div className="mb-6">
            <QRScanner
              onScan={handleScan}
              onError={handleScanError}
              className="max-w-md mx-auto"
            />
          </div>
        )}

        {scanComplete && !isConnected && (
          <div className="flex flex-col items-center justify-center py-8">
            <ConnectionStatus
              state={connectionState as ConnectionState}
              error={error}
              onRetry={handleRetry}
            />
          </div>
        )}

        {/* File picker (shown when connected) */}
        {isConnected && (
          <div className="animate-slideUp">
            <div className="flex items-center gap-2 mb-4">
              <span className="status-indicator status-connected" />
              <span className="text-sm text-green-400">Connected</span>
            </div>

            <FilePicker
              onFilesSelected={handleFilesSelected}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              className="mb-6"
            />

            <button
              onClick={handleStartTransfer}
              disabled={selectedFiles.length === 0}
              className="btn btn-primary w-full text-lg py-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Send {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}` : 'Files'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
