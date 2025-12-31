import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { formatPeerId } from '../utils/peerUtils';

interface PeerIdDisplayProps {
  peerId: string | null;
  loading?: boolean;
  className?: string;
}

export function PeerIdDisplay({ peerId, loading = false, className = '' }: PeerIdDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (!peerId) return;
    
    try {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  if (loading) {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <div className="w-48 h-48 rounded-2xl bg-surface-800 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary-400 spinner" />
        </div>
        <p className="text-surface-400">Generating connection code...</p>
      </div>
    );
  }
  
  if (!peerId) {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <div className="w-48 h-48 rounded-2xl bg-surface-800 flex items-center justify-center">
          <p className="text-surface-500">No connection</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {/* QR Code */}
      <div className="qr-container rounded-2xl shadow-lg">
        <QRCodeSVG
          value={peerId}
          size={180}
          level="M"
          bgColor="#ffffff"
          fgColor="#1e1b4b"
          includeMargin={false}
        />
      </div>
      
      {/* Peer ID Display */}
      <div className="text-center">
        <p className="text-surface-400 text-sm mb-2">Your Connection Code</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-mono font-bold tracking-wider gradient-text">
            {formatPeerId(peerId)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4 text-success-400" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="glass-light rounded-xl p-4 max-w-sm text-center">
        <p className="text-surface-300 text-sm">
          Share this code or QR with the person you want to receive files from
        </p>
      </div>
    </div>
  );
}
