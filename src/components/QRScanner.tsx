/**
 * QRScanner - Camera-based QR code scanner
 * Uses html5-qrcode library for scanning
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (value: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function QRScanner({ onScan, onError, className = '' }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  const initScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    const scannerId = `qr-scanner-${Date.now()}`;
    containerRef.current.id = scannerId;

    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Prevent multiple scans
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          
          // Vibrate on successful scan (if supported)
          if ('vibrate' in navigator) {
            navigator.vibrate(100);
          }
          
          onScan(decodedText);
        },
        () => {
          // Ignore QR code not found errors (expected during scanning)
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      
      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
        setPermissionDenied(true);
      } else {
        setError(errorMessage);
      }
      
      onError?.(errorMessage);
    }
  }, [onScan, onError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // Check if scanner is actually running before stopping
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    initScanner();

    return () => {
      stopScanner();
    };
  }, [initScanner, stopScanner]);

  const handleRetry = () => {
    hasScannedRef.current = false;
    setPermissionDenied(false);
    setError(null);
    stopScanner().then(initScanner);
  };

  if (permissionDenied) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Camera Permission Required</h3>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Please allow camera access to scan QR codes
          </p>
          <button onClick={handleRetry} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Scanner Error</h3>
          <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
          <button onClick={handleRetry} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef} 
        className="qr-scanner-container rounded-xl overflow-hidden"
        style={{ minHeight: 300 }}
      />
      
      {!isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
        </div>
      )}
      
      <p className="text-center mt-4 text-[var(--color-text-secondary)]">
        Point your camera at the QR code
      </p>
    </div>
  );
}
