/**
 * usePeer - React hook for PeerJS connection management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { peerManager } from '../services/PeerManager';
import type { ConnectionState } from '../types';

interface UsePeerReturn {
  peerId: string | null;
  remotePeerId: string | null;
  connectionState: ConnectionState;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  initialize: () => Promise<string>;
  connect: (remotePeerId: string) => Promise<void>;
  disconnect: () => void;
  reset: () => Promise<string>;
}

export function usePeer(): UsePeerReturn {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // Set up callbacks on mount
  useEffect(() => {
    peerManager.onStateChange((state) => {
      setConnectionState(state);
      if (state === 'error') {
        // Error will be set via onError callback
      } else {
        setError(null);
      }
    });

    peerManager.onConnection((remoteId) => {
      setRemotePeerId(remoteId);
    });

    peerManager.onError((err) => {
      setError(err);
    });

    // Cleanup on unmount
    return () => {
      peerManager.destroy();
    };
  }, []);

  const initialize = useCallback(async (): Promise<string> => {
    if (initialized.current && peerManager.localPeerId) {
      return peerManager.localPeerId;
    }

    try {
      setError(null);
      const id = await peerManager.initialize();
      setPeerId(id);
      initialized.current = true;
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const connect = useCallback(async (targetPeerId: string): Promise<void> => {
    try {
      setError(null);
      await peerManager.connect(targetPeerId);
      setRemotePeerId(targetPeerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    peerManager.disconnect();
    setRemotePeerId(null);
  }, []);

  const reset = useCallback(async (): Promise<string> => {
    initialized.current = false;
    setRemotePeerId(null);
    setError(null);
    const id = await peerManager.reset();
    setPeerId(id);
    initialized.current = true;
    return id;
  }, []);

  return {
    peerId,
    remotePeerId,
    connectionState,
    error,
    isConnected: connectionState === 'connected' || connectionState === 'transferring',
    isConnecting: connectionState === 'connecting',
    initialize,
    connect,
    disconnect,
    reset,
  };
}
