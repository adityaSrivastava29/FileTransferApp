/**
 * useWakeLock - React hook for Screen Wake Lock API
 * Keeps the screen awake during file transfers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isWakeLockSupported } from '../utils/platform';

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported = isWakeLockSupported();

  // Handle visibility change - re-acquire lock when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === 'visible' &&
        wakeLockRef.current === null &&
        isActive
      ) {
        try {
          await requestWakeLock();
        } catch {
          // Silently fail - user may have denied permission
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  const requestWakeLock = async (): Promise<void> => {
    if (!isSupported) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);

      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
        // Don't set isActive to false here - we may want to re-acquire
      });
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      wakeLockRef.current = null;
      setIsActive(false);
    }
  };

  const request = useCallback(async (): Promise<void> => {
    await requestWakeLock();
  }, []);

  const release = useCallback(async (): Promise<void> => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    setIsActive(false);
  }, []);

  return {
    isSupported,
    isActive,
    request,
    release,
  };
}
