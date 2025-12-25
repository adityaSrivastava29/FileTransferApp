/**
 * ReceivePage - Displays QR code for sender to scan
 */

import { useEffect, useState } from 'react';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { usePeer } from '../hooks/usePeer';
import type { ConnectionState } from '../types';

interface ReceivePageProps {
  onConnected: () => void;
  onBack: () => void;
}

export function ReceivePage({ onConnected, onBack }: ReceivePageProps) {
  const { peerId, connectionState, error, initialize, reset } = usePeer();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [initialize]);

  // Navigate to transfer screen when connected
  useEffect(() => {
    if (connectionState === 'connected' || connectionState === 'transferring') {
      onConnected();
    }
  }, [connectionState, onConnected]);

  const handleRetry = async () => {
    setIsInitializing(true);
    try {
      await reset();
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="page animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="btn btn-ghost p-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Receive Files</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isInitializing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
            <p className="text-[var(--color-text-secondary)]">Generating QR code...</p>
          </div>
        ) : peerId ? (
          <div className="flex flex-col items-center animate-scaleIn">
            <QRCodeDisplay value={peerId} size={280} />
            
            <div className="mt-6 text-center">
              <p className="text-[var(--color-text-secondary)] mb-2">
                Ask sender to scan this code
              </p>
              <ConnectionStatus
                state={connectionState as ConnectionState}
                error={error}
                onRetry={handleRetry}
              />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-red-400 mb-4">Failed to generate QR code</p>
            <button onClick={handleRetry} className="btn btn-primary">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-auto pt-8 text-center text-sm text-[var(--color-text-muted)]">
        <p>Keep this screen open while transferring</p>
      </div>
    </div>
  );
}
