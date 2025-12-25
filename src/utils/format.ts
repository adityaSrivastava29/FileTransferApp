/**
 * Formatting utilities for file sizes, time, and speeds
 */

/**
 * Format bytes to human readable string
 * @param bytes - Number of bytes
 * @param decimals - Decimal places (default: 2)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  if (!isFinite(bytes)) return 'Unknown';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * Format transfer speed to human readable string
 * @param bytesPerSecond - Speed in bytes per second
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (!isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return '-- MB/s';
  }
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Format remaining time to human readable string
 * @param seconds - Remaining time in seconds
 */
export function formatTimeRemaining(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) {
    return 'Calculating...';
  }
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s remaining`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}m ${secs}s remaining`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m remaining`;
}

/**
 * Format percentage with fixed decimals
 * @param progress - Progress value 0-100
 */
export function formatProgress(progress: number): string {
  return `${Math.min(100, Math.max(0, progress)).toFixed(1)}%`;
}

/**
 * Truncate filename if too long, preserving extension
 * @param filename - Original filename
 * @param maxLength - Maximum length (default: 25)
 */
export function truncateFilename(filename: string, maxLength = 25): string {
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.split('.').pop() || '';
  const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4); // 4 for "..." and "."
  
  return `${truncatedName}...${extension ? `.${extension}` : ''}`;
}

/**
 * Generate a unique ID for files
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce function to limit rapid calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function to limit call frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}
