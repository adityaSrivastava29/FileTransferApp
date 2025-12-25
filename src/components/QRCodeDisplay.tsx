/**
 * QRCodeDisplay - Displays a QR code containing the peer ID
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { extractDisplayId } from '../utils/platform';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 256, className = '' }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract short display ID from full peer ID
  const displayId = extractDisplayId(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(() => setError(null))
      .catch((err) => setError(err.message));
  }, [value, size]);

  if (error) {
    return (
      <div className="qr-container flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-red-500 text-sm">Failed to generate QR code</p>
      </div>
    );
  }

  return (
    <div className={`qr-container ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="text-center mt-3 font-mono text-xl font-bold text-gray-800 tracking-widest">
        {displayId}
      </p>
    </div>
  );
}
