import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { parsePeerId, validatePeerId } from '../utils/peerUtils';

interface QRScannerProps {
  onScan: (peerId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function QRScanner({ onScan, onError, className = '' }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      
      // Create scanner instance
      scannerRef.current = new Html5Qrcode('qr-scanner-container');
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Parse and validate the peer ID
          const peerId = parsePeerId(decodedText);
          const validation = validatePeerId(peerId);
          
          if (validation.valid) {
            stopScanner();
            onScan(peerId);
          } else {
            setError('Invalid QR code');
          }
        },
        () => {
          // QR code parse error - ignore, keep scanning
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      const errorMessage = (err as Error).message;
      
      if (errorMessage.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access.');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('No camera found on this device.');
        setHasCamera(false);
      } else {
        setError('Failed to start camera. Please try again.');
      }
      
      onError?.(errorMessage);
    }
  };
  
  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);
  
  if (!hasCamera) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <CameraOff className="w-12 h-12 text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">No camera available</p>
        <p className="text-surface-500 text-sm mt-2">
          Please enter the connection code manually
        </p>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Scanner container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-surface-800"
      >
        <div
          id="qr-scanner-container"
          className="w-full h-full"
          style={{ display: isScanning ? 'block' : 'none' }}
        />
        
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Camera className="w-16 h-16 text-surface-500" />
            <p className="text-surface-400">Camera not active</p>
          </div>
        )}
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corners */}
            <div className="absolute top-1/4 left-1/4 w-8 h-8 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
            <div className="absolute top-1/4 right-1/4 w-8 h-8 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
            <div className="absolute bottom-1/4 left-1/4 w-8 h-8 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
            <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
            
            {/* Scanning line animation */}
            <div className="absolute left-1/4 right-1/4 h-0.5 bg-primary-400 animate-pulse-soft"
              style={{ top: '50%' }}
            />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-error-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Control buttons */}
      <Button
        variant={isScanning ? 'secondary' : 'primary'}
        onClick={isScanning ? stopScanner : startScanner}
        icon={isScanning ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
      >
        {isScanning ? 'Stop Camera' : 'Start Camera'}
      </Button>
      
      <p className="text-surface-500 text-sm text-center">
        Point your camera at a ShareDrop QR code
      </p>
    </div>
  );
}
