import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import Peer from 'peerjs';
import type { ConnectionStatus, PeerMessage, MessageType } from '../types';
import { generatePeerId } from '../utils/peerUtils';
import { useTransferStore } from '../store/transferStore';

// Infer DataConnection type from Peer.connect return type
type DataConnection = ReturnType<Peer['connect']>;

interface PeerContextValue {
  // State
  peerId: string | null;
  status: ConnectionStatus;
  remotePeerId: string | null;
  connection: DataConnection | null;
  error: string | null;
  
  // Actions
  initializePeer: (customId?: string) => Promise<string>;
  connectToPeer: (remotePeerId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (type: MessageType, payload: unknown) => void;
  
  // Event handlers (to be set by components)
  onMessage: React.MutableRefObject<((message: PeerMessage) => void) | null>;
}

const PeerContext = createContext<PeerContextValue | null>(null);

export function PeerProvider({ children }: { children: React.ReactNode }) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const onMessage = useRef<((message: PeerMessage) => void) | null>(null);
  
  const { addToast } = useTransferStore();
  
  // Handle incoming connection
  const handleConnection = useCallback((conn: DataConnection) => {
    console.log('Incoming connection from:', conn.peer);
    
    conn.on('open', () => {
      console.log('Connection opened with:', conn.peer);
      setConnection(conn);
      setRemotePeerId(conn.peer);
      setStatus('connected');
      addToast({ type: 'success', message: `Connected to ${conn.peer}` });
    });
    
    conn.on('data', (data) => {
      console.log('Received data:', data);
      if (onMessage.current) {
        onMessage.current(data as PeerMessage);
      }
    });
    
    conn.on('close', () => {
      console.log('Connection closed');
      setConnection(null);
      setRemotePeerId(null);
      setStatus('waiting');
      addToast({ type: 'info', message: 'Peer disconnected' });
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setError(err.message);
      addToast({ type: 'error', message: `Connection error: ${err.message}` });
    });
  }, [addToast]);
  
  // Initialize peer
  const initializePeer = useCallback(async (customId?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing peer
        if (peerRef.current) {
          peerRef.current.destroy();
        }
        
        setStatus('connecting');
        setError(null);
        
        const id = customId || generatePeerId();
        console.log('Initializing peer with ID:', id);
        
        const peer = new Peer(id, {
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });
        
        peer.on('open', (openedId) => {
          console.log('Peer opened with ID:', openedId);
          setPeerId(openedId);
          setStatus('waiting');
          peerRef.current = peer;
          resolve(openedId);
        });
        
        peer.on('connection', handleConnection);
        
        peer.on('disconnected', () => {
          console.log('Peer disconnected from server');
          setStatus('disconnected');
          // Try to reconnect
          peer.reconnect();
        });
        
        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError(err.message);
          setStatus('error');
          
          if (err.type === 'unavailable-id') {
            // Generate new ID and retry
            const newId = generatePeerId();
            initializePeer(newId).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });
        
        peer.on('close', () => {
          console.log('Peer closed');
          setStatus('disconnected');
          setPeerId(null);
        });
        
      } catch (err) {
        console.error('Failed to initialize peer:', err);
        setError((err as Error).message);
        setStatus('error');
        reject(err);
      }
    });
  }, [handleConnection]);
  
  // Connect to remote peer
  const connectToPeer = useCallback(async (targetPeerId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!peerRef.current) {
        reject(new Error('Peer not initialized'));
        return;
      }
      
      console.log('Connecting to peer:', targetPeerId);
      setStatus('connecting');
      
      const conn = peerRef.current.connect(targetPeerId, {
        reliable: true,
      });
      
      conn.on('open', () => {
        console.log('Connected to:', targetPeerId);
        setConnection(conn);
        setRemotePeerId(targetPeerId);
        setStatus('connected');
        addToast({ type: 'success', message: `Connected to ${targetPeerId}` });
        resolve();
      });
      
      conn.on('data', (data) => {
        console.log('Received data:', data);
        if (onMessage.current) {
          onMessage.current(data as PeerMessage);
        }
      });
      
      conn.on('close', () => {
        console.log('Connection closed');
        setConnection(null);
        setRemotePeerId(null);
        setStatus('waiting');
        addToast({ type: 'info', message: 'Peer disconnected' });
      });
      
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setError(err.message);
        setStatus('error');
        addToast({ type: 'error', message: `Connection error: ${err.message}` });
        reject(err);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (status === 'connecting') {
          conn.close();
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }, [addToast, status]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (connection) {
      connection.close();
    }
    setConnection(null);
    setRemotePeerId(null);
    setStatus('waiting');
  }, [connection]);
  
  // Send message
  const sendMessage = useCallback((type: MessageType, payload: unknown) => {
    if (!connection) {
      console.warn('No active connection');
      return;
    }
    
    const message: PeerMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };
    
    console.log('Sending message:', message);
    connection.send(message);
  }, [connection]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);
  
  const value: PeerContextValue = {
    peerId,
    status,
    remotePeerId,
    connection,
    error,
    initializePeer,
    connectToPeer,
    disconnect,
    sendMessage,
    onMessage,
  };
  
  return (
    <PeerContext.Provider value={value}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeer() {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeer must be used within a PeerProvider');
  }
  return context;
}
