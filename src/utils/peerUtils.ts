/**
 * Generate a short, memorable peer ID
 * Format: 6 alphanumeric characters (uppercase letters and numbers)
 * This gives us 36^6 = 2.1 billion possible combinations
 */
export function generatePeerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars: I, O, 0, 1
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return result;
}

/**
 * Validate a peer ID format
 */
export function validatePeerId(peerId: string): { valid: boolean; error?: string } {
  if (!peerId || peerId.trim() === '') {
    return { valid: false, error: 'Peer ID is required' };
  }
  
  const trimmed = peerId.trim().toUpperCase();
  
  if (trimmed.length !== 6) {
    return { valid: false, error: 'Peer ID must be 6 characters' };
  }
  
  const validChars = /^[A-Z0-9]+$/;
  if (!validChars.test(trimmed)) {
    return { valid: false, error: 'Peer ID must contain only letters and numbers' };
  }
  
  return { valid: true };
}

/**
 * Format peer ID for display (adds spacing for readability)
 */
export function formatPeerId(peerId: string): string {
  if (!peerId || peerId.length !== 6) return peerId;
  return `${peerId.slice(0, 3)}-${peerId.slice(3)}`;
}

/**
 * Parse formatted peer ID back to raw format
 */
export function parsePeerId(formatted: string): string {
  return formatted.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Create a connection timeout promise
 */
export function createConnectionTimeout(ms: number = 30000): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, ms);
  });
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
