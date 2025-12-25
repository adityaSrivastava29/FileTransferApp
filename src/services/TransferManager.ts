/**
 * TransferManager - Handles chunked file transfer logic
 * Manages sending and receiving files in chunks with progress tracking
 */

import { peerManager } from './PeerManager';
import { ThroughputCalculator } from './ThroughputCalculator';
import { getMaxChunkSize } from '../utils/platform';
import { generateFileId } from '../utils/format';
import type {
  FileMetadata,
  TransferFile,
  TransferProgress,
  FileChunkMessage,
  FileMetadataMessage,
  FileCompleteMessage,
  TransferMessage,
} from '../types';

export type ProgressCallback = (progress: TransferProgress) => void;
export type FileReceivedCallback = (file: TransferFile) => void;
export type TransferCompleteCallback = () => void;
export type ErrorCallback = (error: string, fileId?: string) => void;

interface TransferManagerConfig {
  initialChunkSize?: number;
  maxChunkSize?: number;
  minChunkSize?: number;
  throttleInterval?: number;
}

const DEFAULT_CONFIG: Required<TransferManagerConfig> = {
  initialChunkSize: 65536, // 64KB
  maxChunkSize: getMaxChunkSize(),
  minChunkSize: 16384, // 16KB
  throttleInterval: 100, // Update progress every 100ms max
};

export class TransferManager {
  private config: Required<TransferManagerConfig>;
  
  // Transfer state
  private sendingFiles: Map<string, {
    file: File;
    metadata: FileMetadata;
    chunkIndex: number;
    totalChunks: number;
    bytesTransferred: number;
    calculator: ThroughputCalculator;
    paused: boolean;
  }> = new Map();
  
  private receivingFiles: Map<string, {
    metadata: FileMetadata;
    chunks: ArrayBuffer[];
    receivedChunks: number;
    totalChunks: number;
    bytesReceived: number;
    calculator: ThroughputCalculator;
  }> = new Map();
  
  // Current chunk size (adaptive)
  private currentChunkSize: number;
  
  // Callbacks
  private progressCallback: ProgressCallback | null = null;
  private fileReceivedCallback: FileReceivedCallback | null = null;
  private transferCompleteCallback: TransferCompleteCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  
  // Throttling
  private lastProgressUpdate = 0;
  private pendingProgressUpdates: Map<string, TransferProgress> = new Map();
  private progressThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: TransferManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentChunkSize = this.config.initialChunkSize;
    
    // Set up message handler
    peerManager.onMessage(this.handleMessage.bind(this));
  }

  // ============================================
  // Callback Setters
  // ============================================

  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  onFileReceived(callback: FileReceivedCallback): void {
    this.fileReceivedCallback = callback;
  }

  onTransferComplete(callback: TransferCompleteCallback): void {
    this.transferCompleteCallback = callback;
  }

  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  // ============================================
  // Sending Files
  // ============================================

  /**
   * Queue files for sending
   * @param files - Array of File objects to send
   */
  async sendFiles(files: File[]): Promise<void> {
    if (!peerManager.isConnected) {
      throw new Error('Not connected to peer');
    }

    // Create metadata for all files
    const fileMetadataList: FileMetadata[] = files.map(file => ({
      id: generateFileId(),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));

    // Initialize sending state for each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadata = fileMetadataList[i];
      const totalChunks = Math.ceil(file.size / this.currentChunkSize);

      this.sendingFiles.set(metadata.id, {
        file,
        metadata,
        chunkIndex: 0,
        totalChunks,
        bytesTransferred: 0,
        calculator: new ThroughputCalculator(),
        paused: false,
      });
    }

    // Send metadata message first
    const metadataMessage: FileMetadataMessage = {
      type: 'file-metadata',
      files: fileMetadataList,
      timestamp: Date.now(),
    };
    peerManager.send(metadataMessage);
    peerManager.setTransferring();

    // Start sending files sequentially
    for (const metadata of fileMetadataList) {
      await this.sendFileChunks(metadata.id);
    }

    // All files sent
    this.transferCompleteCallback?.();
  }

  /**
   * Send chunks for a single file
   */
  private async sendFileChunks(fileId: string): Promise<void> {
    const sending = this.sendingFiles.get(fileId);
    if (!sending) return;

    const { file, metadata, totalChunks, calculator } = sending;
    
    while (sending.chunkIndex < totalChunks) {
      if (sending.paused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const start = sending.chunkIndex * this.currentChunkSize;
      const end = Math.min(start + this.currentChunkSize, file.size);
      const chunkData = await this.readFileChunk(file, start, end);

      const chunkMessage: FileChunkMessage = {
        type: 'file-chunk',
        fileId,
        chunkIndex: sending.chunkIndex,
        totalChunks,
        data: chunkData,
        timestamp: Date.now(),
      };

      const sent = await peerManager.sendBinary(chunkData);
      if (!sent) {
        this.errorCallback?.('Failed to send chunk', fileId);
        return;
      }

      // Also send the chunk metadata
      peerManager.send({
        ...chunkMessage,
        data: undefined, // Don't send data twice
      } as unknown as TransferMessage);

      sending.chunkIndex++;
      sending.bytesTransferred += chunkData.byteLength;
      
      calculator.addSample(chunkData.byteLength);
      
      // Update progress
      this.updateProgress({
        fileId,
        fileName: metadata.name,
        fileSize: metadata.size,
        bytesTransferred: sending.bytesTransferred,
        totalBytes: metadata.size,
        speedBps: calculator.getSpeed(),
        estimatedTimeRemaining: calculator.getETA(metadata.size - sending.bytesTransferred),
        state: 'sending',
        progress: (sending.bytesTransferred / metadata.size) * 100,
      });

      // Adaptive chunk size based on speed
      this.adaptChunkSize(calculator.getSpeed());
    }

    // Send file complete message
    const completeMessage: FileCompleteMessage = {
      type: 'file-complete',
      fileId,
      timestamp: Date.now(),
    };
    peerManager.send(completeMessage);

    // Mark as completed
    this.updateProgress({
      fileId,
      fileName: metadata.name,
      fileSize: metadata.size,
      bytesTransferred: metadata.size,
      totalBytes: metadata.size,
      speedBps: calculator.getSpeed(),
      estimatedTimeRemaining: 0,
      state: 'completed',
      progress: 100,
    });

    this.sendingFiles.delete(fileId);
  }

  /**
   * Read a chunk of a file as ArrayBuffer
   */
  private readFileChunk(file: File, start: number, end: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const slice = file.slice(start, end);
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(slice);
    });
  }

  /**
   * Adapt chunk size based on current speed
   */
  private adaptChunkSize(speedBps: number): void {
    // Target: each chunk takes ~100ms to send
    const targetTime = 0.1;
    const idealSize = speedBps * targetTime;
    
    const newSize = Math.max(
      this.config.minChunkSize,
      Math.min(this.config.maxChunkSize, idealSize)
    );
    
    // Smooth adaptation (don't change too drastically)
    this.currentChunkSize = Math.round(
      this.currentChunkSize * 0.7 + newSize * 0.3
    );
  }

  // ============================================
  // Receiving Files
  // ============================================

  /**
   * Handle incoming messages
   */
  private handleMessage(message: TransferMessage): void {
    switch (message.type) {
      case 'file-metadata':
        this.handleFileMetadata(message as FileMetadataMessage);
        break;
      case 'file-chunk':
        // Chunk data comes separately as binary
        break;
      case 'file-complete':
        this.handleFileComplete(message as FileCompleteMessage);
        break;
    }
  }

  /**
   * Handle file metadata message (receiver side)
   */
  private handleFileMetadata(message: FileMetadataMessage): void {
    peerManager.setTransferring();
    
    for (const metadata of message.files) {
      const totalChunks = Math.ceil(metadata.size / this.currentChunkSize);
      
      this.receivingFiles.set(metadata.id, {
        metadata,
        chunks: new Array(totalChunks),
        receivedChunks: 0,
        totalChunks,
        bytesReceived: 0,
        calculator: new ThroughputCalculator(),
      });

      // Initial progress
      this.updateProgress({
        fileId: metadata.id,
        fileName: metadata.name,
        fileSize: metadata.size,
        bytesTransferred: 0,
        totalBytes: metadata.size,
        speedBps: 0,
        estimatedTimeRemaining: Infinity,
        state: 'receiving',
        progress: 0,
      });
    }
  }

  /**
   * Handle incoming binary chunk (called from outside)
   */
  handleChunk(fileId: string, chunkIndex: number, data: ArrayBuffer): void {
    const receiving = this.receivingFiles.get(fileId);
    if (!receiving) return;

    receiving.chunks[chunkIndex] = data;
    receiving.receivedChunks++;
    receiving.bytesReceived += data.byteLength;
    receiving.calculator.addSample(data.byteLength);

    const { metadata, bytesReceived, calculator } = receiving;

    this.updateProgress({
      fileId,
      fileName: metadata.name,
      fileSize: metadata.size,
      bytesTransferred: bytesReceived,
      totalBytes: metadata.size,
      speedBps: calculator.getSpeed(),
      estimatedTimeRemaining: calculator.getETA(metadata.size - bytesReceived),
      state: 'receiving',
      progress: (bytesReceived / metadata.size) * 100,
    });
  }

  /**
   * Handle file complete message
   */
  private handleFileComplete(message: FileCompleteMessage): void {
    const receiving = this.receivingFiles.get(message.fileId);
    if (!receiving) return;

    const { metadata, chunks, calculator } = receiving;
    
    const transferFile: TransferFile = {
      ...metadata,
      chunks: chunks.filter(Boolean),
      receivedChunks: receiving.receivedChunks,
      totalChunks: receiving.totalChunks,
    };

    // Final progress update
    this.updateProgress({
      fileId: metadata.id,
      fileName: metadata.name,
      fileSize: metadata.size,
      bytesTransferred: metadata.size,
      totalBytes: metadata.size,
      speedBps: calculator.getSpeed(),
      estimatedTimeRemaining: 0,
      state: 'completed',
      progress: 100,
    });

    this.fileReceivedCallback?.(transferFile);
    this.receivingFiles.delete(message.fileId);

    // Check if all files received
    if (this.receivingFiles.size === 0) {
      peerManager.setCompleted();
      this.transferCompleteCallback?.();
    }
  }

  // ============================================
  // Progress Updates (Throttled)
  // ============================================

  private updateProgress(progress: TransferProgress): void {
    this.pendingProgressUpdates.set(progress.fileId, progress);

    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.config.throttleInterval) {
      this.flushProgressUpdates();
    } else if (!this.progressThrottleTimer) {
      this.progressThrottleTimer = setTimeout(() => {
        this.flushProgressUpdates();
        this.progressThrottleTimer = null;
      }, this.config.throttleInterval);
    }
  }

  private flushProgressUpdates(): void {
    this.lastProgressUpdate = Date.now();
    
    for (const progress of this.pendingProgressUpdates.values()) {
      this.progressCallback?.(progress);
    }
    
    this.pendingProgressUpdates.clear();
  }

  // ============================================
  // Control Methods
  // ============================================

  /**
   * Pause a specific file transfer
   */
  pauseTransfer(fileId: string): void {
    const sending = this.sendingFiles.get(fileId);
    if (sending) {
      sending.paused = true;
    }
  }

  /**
   * Resume a specific file transfer
   */
  resumeTransfer(fileId: string): void {
    const sending = this.sendingFiles.get(fileId);
    if (sending) {
      sending.paused = false;
    }
  }

  /**
   * Cancel all transfers
   */
  cancelAll(): void {
    this.sendingFiles.clear();
    this.receivingFiles.clear();
    this.pendingProgressUpdates.clear();
    
    if (this.progressThrottleTimer) {
      clearTimeout(this.progressThrottleTimer);
      this.progressThrottleTimer = null;
    }
  }

  /**
   * Get all current transfer progress
   */
  getAllProgress(): TransferProgress[] {
    return Array.from(this.pendingProgressUpdates.values());
  }

  /**
   * Reset the transfer manager
   */
  reset(): void {
    this.cancelAll();
    this.currentChunkSize = this.config.initialChunkSize;
  }
}

// Create singleton instance
export const transferManager = new TransferManager();
