import { CHUNK_SIZE, FILE_ICONS } from '../types';
import type { FileMetadata, ChunkedFile } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format transfer speed to human-readable string
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

/**
 * Get icon for file based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  // Check for exact match first
  if (FILE_ICONS[mimeType]) {
    return FILE_ICONS[mimeType];
  }
  
  // Check for category match
  const category = mimeType.split('/')[0];
  if (FILE_ICONS[category]) {
    return FILE_ICONS[category];
  }
  
  return FILE_ICONS['default'];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

/**
 * Create file metadata from File object
 */
export function createFileMetadata(file: File): FileMetadata {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  
  return {
    id: uuidv4(),
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified,
    chunks,
  };
}

/**
 * Split file into chunks
 */
export async function chunkFile(file: File): Promise<ChunkedFile> {
  const metadata = createFileMetadata(file);
  const chunks: ArrayBuffer[] = [];
  
  for (let i = 0; i < metadata.chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);
    const buffer = await blob.arrayBuffer();
    chunks.push(buffer);
  }
  
  return { metadata, chunks };
}

/**
 * Reassemble chunks into a Blob
 */
export function reassembleChunks(chunks: ArrayBuffer[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType });
}

/**
 * Trigger file download
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calculate total size of multiple files
 */
export function calculateTotalSize(files: File[] | FileMetadata[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Validate file (add file type/size restrictions as needed)
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Max file size: 2GB per file (WebRTC limitation considerations)
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File "${file.name}" exceeds maximum size of 2GB` };
  }
  
  if (file.size === 0) {
    return { valid: false, error: `File "${file.name}" is empty` };
  }
  
  return { valid: true };
}

/**
 * Simple checksum using array buffer
 * For production, consider using Web Crypto API for SHA-256
 */
export async function calculateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
