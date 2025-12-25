/**
 * Core TypeScript types for the P2P File Transfer App
 * All types are strictly typed with no implicit any
 */

// ============================================
// Connection State Machine
// ============================================

export type ConnectionState = 
  | 'idle'        // No connection attempted
  | 'connecting'  // Connection in progress
  | 'connected'   // Peer connected, ready to transfer
  | 'transferring' // Active file transfer
  | 'completed'   // Transfer completed successfully
  | 'error';      // Connection or transfer error

export interface ConnectionInfo {
  state: ConnectionState;
  localPeerId: string | null;
  remotePeerId: string | null;
  error: string | null;
  retryCount: number;
}

// ============================================
// Transfer State Machine
// ============================================

export type TransferState = 
  | 'queued'     // File waiting to be sent
  | 'sending'    // Currently being sent (sender side)
  | 'receiving'  // Currently being received (receiver side)
  | 'completed'  // Transfer finished successfully
  | 'failed';    // Transfer failed

export type TransferRole = 'sender' | 'receiver';

// ============================================
// File Types
// ============================================

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface TransferFile extends FileMetadata {
  file?: File; // Only present on sender side
  chunks: ArrayBuffer[]; // Accumulated chunks on receiver side
  receivedChunks: number;
  totalChunks: number;
}

// ============================================
// Transfer Progress
// ============================================

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  totalBytes: number;
  speedBps: number; // Bytes per second
  estimatedTimeRemaining: number; // Seconds
  state: TransferState;
  progress: number; // 0-100 percentage
}

export interface OverallProgress {
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  transferredBytes: number;
  overallSpeedBps: number;
  estimatedTimeRemaining: number;
  progress: number; // 0-100 percentage
}

// ============================================
// Chunk Types (for transfer protocol)
// ============================================

export interface FileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  isLast: boolean;
}

// Message types for WebRTC DataChannel
export type MessageType = 
  | 'file-metadata'
  | 'file-chunk'
  | 'file-complete'
  | 'transfer-start'
  | 'transfer-pause'
  | 'transfer-resume'
  | 'transfer-cancel'
  | 'ack';

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface FileMetadataMessage extends BaseMessage {
  type: 'file-metadata';
  files: FileMetadata[];
}

export interface FileChunkMessage extends BaseMessage {
  type: 'file-chunk';
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
}

export interface FileCompleteMessage extends BaseMessage {
  type: 'file-complete';
  fileId: string;
}

export interface TransferControlMessage extends BaseMessage {
  type: 'transfer-start' | 'transfer-pause' | 'transfer-resume' | 'transfer-cancel';
}

export interface AckMessage extends BaseMessage {
  type: 'ack';
  fileId: string;
  chunkIndex: number;
}

export type TransferMessage = 
  | FileMetadataMessage 
  | FileChunkMessage 
  | FileCompleteMessage 
  | TransferControlMessage
  | AckMessage;

// ============================================
// App State
// ============================================

export type AppScreen = 
  | 'home'
  | 'send'
  | 'receive'
  | 'transfer'
  | 'complete';

export interface AppState {
  screen: AppScreen;
  role: TransferRole | null;
  connection: ConnectionInfo;
  transfers: Map<string, TransferProgress>;
  overallProgress: OverallProgress | null;
  receivedFiles: TransferFile[];
  error: string | null;
}

// ============================================
// Action Types for Reducer
// ============================================

export type AppAction =
  | { type: 'SET_SCREEN'; screen: AppScreen }
  | { type: 'SET_ROLE'; role: TransferRole }
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_LOCAL_PEER_ID'; peerId: string }
  | { type: 'SET_REMOTE_PEER_ID'; peerId: string }
  | { type: 'SET_CONNECTION_ERROR'; error: string }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'RESET_CONNECTION' }
  | { type: 'ADD_TRANSFER'; progress: TransferProgress }
  | { type: 'UPDATE_TRANSFER'; fileId: string; update: Partial<TransferProgress> }
  | { type: 'REMOVE_TRANSFER'; fileId: string }
  | { type: 'UPDATE_OVERALL_PROGRESS'; progress: OverallProgress }
  | { type: 'ADD_RECEIVED_FILE'; file: TransferFile }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET_STATE' };

// ============================================
// Worker Message Types
// ============================================

export interface ChunkWorkerRequest {
  type: 'chunk-file';
  file: File;
  fileId: string;
  chunkSize: number;
}

export interface ChunkWorkerResponse {
  type: 'chunk-ready' | 'chunk-complete' | 'chunk-error';
  fileId: string;
  chunkIndex?: number;
  totalChunks?: number;
  data?: ArrayBuffer;
  error?: string;
}

export interface ZipWorkerRequest {
  type: 'add-file' | 'generate-zip';
  fileName?: string;
  data?: ArrayBuffer;
}

export interface ZipWorkerResponse {
  type: 'file-added' | 'zip-ready' | 'zip-error' | 'zip-progress';
  progress?: number;
  data?: Blob;
  error?: string;
}

// ============================================
// Utility Types
// ============================================

export interface ThroughputSample {
  bytes: number;
  timestamp: number;
}

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isSafari: boolean;
  isChrome: boolean;
}
