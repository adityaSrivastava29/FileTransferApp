/**
 * Platform detection utilities
 * Used for iOS Safari and Android Chrome specific optimizations
 */

import type { PlatformInfo } from '../types';

/**
 * Detect platform information from user agent
 * Cached to avoid repeated regex parsing
 */
let cachedPlatformInfo: PlatformInfo | null = null;

export function getPlatformInfo(): PlatformInfo {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /webOS|BlackBerry|Opera Mini|IEMobile/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);

  cachedPlatformInfo = {
    isIOS,
    isAndroid,
    isMobile,
    isSafari,
    isChrome,
  };

  return cachedPlatformInfo;
}

/**
 * Check if Wake Lock API is supported
 */
export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

/**
 * Check if WebRTC is supported
 */
export function isWebRTCSupported(): boolean {
  return !!(
    window.RTCPeerConnection &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

/**
 * Get maximum recommended chunk size based on platform
 * iOS Safari has stricter memory limits
 */
export function getMaxChunkSize(): number {
  const { isIOS } = getPlatformInfo();
  // iOS: 64KB max, Others: 256KB max
  return isIOS ? 65536 : 262144;
}

/**
 * Get maximum file size for ZIP (4GB limit on iOS)
 */
export function getMaxZipSize(): number {
  const { isIOS } = getPlatformInfo();
  // iOS: 4GB, Others: 8GB
  return isIOS ? 4 * 1024 * 1024 * 1024 : 8 * 1024 * 1024 * 1024;
}
