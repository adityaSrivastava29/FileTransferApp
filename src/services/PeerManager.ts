/**
 * PeerManager - WebRTC/PeerJS connection management
 * Handles peer connection, retries, and state management
 */

import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { ConnectionState, TransferMessage } from '../types';

export type ConnectionCallback = (remotePeerId: string) => void;
export type MessageCallback = (message: TransferMessage) => void;
export type StateChangeCallback = (state: ConnectionState) => void;
export type ErrorCallback = (error: string) => void;

interface PeerManagerConfig {
  maxRetries?: number;
  retryDelay?: number;
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<PeerManagerConfig> = {
  maxRetries: 3,
  retryDelay: 2000,
  debug: false,
};

export class PeerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private config: Required<PeerManagerConfig>;
  
  // State
  private _localPeerId: string | null = null;
  private _remotePeerId: string | null = null;
  private _state: ConnectionState = 'idle';
  private _retryCount = 0;
  
  // Callbacks
  private onConnectionCallback: ConnectionCallback | null = null;
  private onMessageCallback: MessageCallback | null = null;
  private onStateChangeCallback: StateChangeCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  
  // Retry handling
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: PeerManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Getters
  // ============================================

  get localPeerId(): string | null {
    return this._localPeerId;
  }

  get remotePeerId(): string | null {
    return this._remotePeerId;
  }

  get state(): ConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected' || this._state === 'transferring';
  }

  // ============================================
  // Callback Setters
  // ============================================

  onConnection(callback: ConnectionCallback): void {
    this.onConnectionCallback = callback;
  }

  onMessage(callback: MessageCallback): void {
    this.onMessageCallback = callback;
  }

  onStateChange(callback: StateChangeCallback): void {
    this.onStateChangeCallback = callback;
  }

  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }

  // ============================================
  // State Management
  // ============================================

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.log(`State changed: ${state}`);
      this.onStateChangeCallback?.(state);
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[PeerManager]', ...args);
    }
  }

  // ============================================
  // Peer Initialization
  // ============================================

  /**
   * Initialize the peer connection and generate local ID
   * Returns a promise that resolves with the local peer ID
   */
  async initialize(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Generate a short, readable peer ID
        const peerId = this.generatePeerId();
        
        this.peer = new Peer(peerId, {
          debug: this.config.debug ? 3 : 0,
        });

        this.peer.on('open', (id) => {
          this._localPeerId = id;
          this.log('Peer opened with ID:', id);
          this.setState('idle');
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.log('Incoming connection from:', conn.peer);
          this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
          const errorMessage = err.message || 'Unknown peer error';
          this.log('Peer error:', errorMessage);
          
          // Check if it's a recoverable error
          if (err.type === 'peer-unavailable') {
            this.handleRetry('Peer not found');
          } else if (err.type === 'network' || err.type === 'server-error') {
            this.handleRetry(errorMessage);
          } else {
            this.setState('error');
            this.onErrorCallback?.(errorMessage);
            reject(new Error(errorMessage));
          }
        });

        this.peer.on('disconnected', () => {
          this.log('Peer disconnected from server');
          // Try to reconnect
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

        this.peer.on('close', () => {
          this.log('Peer connection closed');
          this.cleanup();
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize peer';
        this.setState('error');
        this.onErrorCallback?.(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }

  /**
   * Generate a short, readable peer ID
   */
  private generatePeerId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like O/0, I/1
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // ============================================
  // Connection Handling
  // ============================================

  /**
   * Connect to a remote peer by ID (sender initiates)
   * @param remotePeerId - The peer ID to connect to
   */
  async connect(remotePeerId: string): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer not initialized. Call initialize() first.');
    }

    if (this.connection) {
      this.connection.close();
    }

    this._retryCount = 0;
    this._remotePeerId = remotePeerId;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      const conn = this.peer!.connect(remotePeerId, {
        reliable: true,
        serialization: 'binary',
      });

      const timeout = setTimeout(() => {
        if (this._state === 'connecting') {
          this.handleRetry('Connection timeout');
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.handleConnection(conn);
        resolve();
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        const errorMessage = err.message || 'Connection failed';
        this.handleRetry(errorMessage);
        reject(new Error(errorMessage));
      });
    });
  }

  /**
   * Handle an established connection
   */
  private handleConnection(conn: DataConnection): void {
    this.connection = conn;
    this._remotePeerId = conn.peer;
    
    conn.on('open', () => {
      this.log('Connection opened with:', conn.peer);
      this.setState('connected');
      this._retryCount = 0;
      this.onConnectionCallback?.(conn.peer);
    });

    conn.on('data', (data) => {
      this.handleMessage(data as TransferMessage);
    });

    conn.on('close', () => {
      this.log('Connection closed');
      if (this._state !== 'completed' && this._state !== 'error') {
        this.handleRetry('Connection closed unexpectedly');
      }
    });

    conn.on('error', (err) => {
      const errorMessage = err.message || 'Connection error';
      this.log('Connection error:', errorMessage);
      this.handleRetry(errorMessage);
    });

    // If connection is already open (receiver side)
    if (conn.open) {
      this.setState('connected');
      this._retryCount = 0;
      this.onConnectionCallback?.(conn.peer);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: TransferMessage): void {
    this.log('Received message:', message.type);
    this.onMessageCallback?.(message);
  }

  /**
   * Handle connection retry with exponential backoff
   */
  private handleRetry(reason: string): void {
    if (this._retryCount >= this.config.maxRetries) {
      this.setState('error');
      this.onErrorCallback?.(`Connection failed after ${this.config.maxRetries} retries: ${reason}`);
      return;
    }

    this._retryCount++;
    const delay = this.config.retryDelay * Math.pow(1.5, this._retryCount - 1);
    this.log(`Retry ${this._retryCount}/${this.config.maxRetries} in ${delay}ms: ${reason}`);

    this.setState('connecting');

    this.retryTimeout = setTimeout(() => {
      if (this._remotePeerId && this.peer) {
        this.connect(this._remotePeerId).catch(() => {
          // Error will be handled in connect
        });
      }
    }, delay);
  }

  // ============================================
  // Data Transfer
  // ============================================

  /**
   * Send a message to the connected peer
   * @param message - The message to send
   */
  send(message: TransferMessage): boolean {
    if (!this.connection || !this.connection.open) {
      this.log('Cannot send: connection not open');
      return false;
    }

    try {
      this.connection.send(message);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      this.log('Send error:', errorMessage);
      return false;
    }
  }

  /**
   * Send binary data (ArrayBuffer) to the connected peer
   * Waits for buffer to drain if necessary (backpressure handling)
   */
  async sendBinary(data: ArrayBuffer): Promise<boolean> {
    if (!this.connection || !this.connection.open) {
      return false;
    }

    const HIGH_WATER_MARK = 1024 * 1024; // 1MB buffer limit

    // Wait for buffer to drain if needed
    // @ts-expect-error - DataConnection has bufferSize but not in types
    while (this.connection.bufferSize > HIGH_WATER_MARK) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!this.connection?.open) return false;
    }

    try {
      this.connection.send(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set state to transferring
   */
  setTransferring(): void {
    if (this._state === 'connected') {
      this.setState('transferring');
    }
  }

  /**
   * Set state to completed
   */
  setCompleted(): void {
    this.setState('completed');
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Disconnect from the current peer
   */
  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this._remotePeerId = null;
    if (this._state !== 'error') {
      this.setState('idle');
    }
  }

  /**
   * Destroy the peer connection completely
   */
  destroy(): void {
    this.cleanup();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this._remotePeerId = null;
    this._retryCount = 0;
  }

  /**
   * Reset the peer for a new session
   */
  async reset(): Promise<string> {
    this.destroy();
    return this.initialize();
  }
}

// Create singleton instance
export const peerManager = new PeerManager({ debug: true });
