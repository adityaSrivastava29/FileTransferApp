import Peer from 'peerjs';

// Infer DataConnection type from Peer.connect return type
type DataConnection = ReturnType<Peer['connect']>;

// ===== File Types =====
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  chunks: number;
}

export interface FileWithMetadata {
  file: File;
  metadata: FileMetadata;
}

// ===== Transfer Types =====
export type TransferStatus = 'pending' | 'transferring' | 'complete' | 'error' | 'cancelled';

export interface TransferProgress {
  fileId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  status: TransferStatus;
  error?: string;
}

export interface TransferSession {
  id: string;
  direction: 'send' | 'receive';
  files: FileMetadata[];
  progress: Map<string, TransferProgress>;
  overallProgress: number;
  startTime: number;
  status: 'pending' | 'in-progress' | 'complete' | 'error' | 'cancelled';
}

// ===== Peer Types =====
export type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

export interface PeerState {
  peerId: string | null;
  status: ConnectionStatus;
  remotePeerId: string | null;
  connection: DataConnection | null;
  error: string | null;
}

// ===== Message Types for P2P Communication =====
export type MessageType = 
  | 'file-offer'        // Sender offers files to receiver
  | 'file-accept'       // Receiver accepts the transfer
  | 'file-reject'       // Receiver rejects the transfer
  | 'file-chunk'        // A chunk of file data
  | 'file-complete'     // Individual file transfer complete
  | 'transfer-complete' // All files transferred
  | 'transfer-cancel'   // Cancel the transfer
  | 'ping'              // Keep connection alive
  | 'pong';             // Response to ping

export interface PeerMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
}

export interface FileOfferPayload {
  files: FileMetadata[];
  totalSize: number;
}

export interface FileChunkPayload {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
}

export interface FileCompletePayload {
  fileId: string;
  checksum?: string;
}

// ===== Component Props =====
export interface ConnectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'send' | 'receive';
}

export interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export interface StatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

export interface FileListProps {
  files: FileMetadata[] | FileWithMetadata[];
  onRemove?: (fileId: string) => void;
  showRemove?: boolean;
  className?: string;
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

// ===== Store Types =====
export interface TransferStore {
  sessions: Map<string, TransferSession>;
  activeSessionId: string | null;
  addSession: (session: TransferSession) => void;
  updateProgress: (sessionId: string, fileId: string, progress: Partial<TransferProgress>) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  clearSessions: () => void;
}

// ===== Utility Types =====
export interface ChunkedFile {
  metadata: FileMetadata;
  chunks: ArrayBuffer[];
}

export const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export const FILE_ICONS: Record<string, string> = {
  'image': '🖼️',
  'video': '🎬',
  'audio': '🎵',
  'application/pdf': '📄',
  'application/zip': '📦',
  'application/x-rar': '📦',
  'text': '📝',
  'default': '📎',
};
