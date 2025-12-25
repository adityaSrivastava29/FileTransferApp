/**
 * CompletePage - Transfer complete with download options
 */

import { useState, useCallback } from 'react';
import { useTransfer } from '../hooks/useTransfer';
import { formatBytes } from '../utils/format';
import type { TransferRole, TransferFile } from '../types';

interface CompletePageProps {
  role: TransferRole;
  onTransferMore: () => void;
  onDone: () => void;
}

export function CompletePage({ role, onTransferMore, onDone }: CompletePageProps) {
  const { receivedFiles, reset } = useTransfer();
  const [downloadAsZip, setDownloadAsZip] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  const downloadFile = useCallback((file: TransferFile) => {
    const blob = new Blob(file.chunks, { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllAsZip = useCallback(async () => {
    if (receivedFiles.length === 0) return;
    
    setIsCreatingZip(true);
    
    try {
      // Dynamic import to avoid loading JSZip when not needed
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const file of receivedFiles) {
        const blob = new Blob(file.chunks, { type: file.type });
        zip.file(file.name, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sharedrop-files-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create ZIP:', error);
    } finally {
      setIsCreatingZip(false);
    }
  }, [receivedFiles]);

  const handleDone = () => {
    reset();
    onDone();
  };

  const handleTransferMore = () => {
    reset();
    onTransferMore();
  };

  const totalSize = receivedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="page items-center justify-center text-center animate-fadeIn">
      {/* Success animation */}
      <div className="mb-8 animate-scaleIn">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Transfer Complete!</h1>
        <p className="text-[var(--color-text-secondary)]">
          {role === 'sender' 
            ? 'Your files have been sent successfully'
            : `${receivedFiles.length} file${receivedFiles.length !== 1 ? 's' : ''} received (${formatBytes(totalSize)})`
          }
        </p>
      </div>

      {/* Download options (receiver only) */}
      {role === 'receiver' && receivedFiles.length > 0 && (
        <div className="w-full max-w-md space-y-4 mb-8 animate-slideUp">
          {/* Individual file downloads */}
          <div className="card max-h-48 overflow-y-auto">
            {receivedFiles.map((file, index) => (
              <div 
                key={file.id || index}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => downloadFile(file)}
                  className="btn btn-ghost p-2 ml-2"
                  aria-label={`Download ${file.name}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* ZIP option */}
          {receivedFiles.length > 1 && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadAsZip}
                  onChange={(e) => setDownloadAsZip(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-[var(--color-primary)] bg-transparent checked:bg-[var(--color-primary)]"
                />
                <span className="text-sm">Download as ZIP</span>
              </label>
              
              {downloadAsZip && (
                <button
                  onClick={downloadAllAsZip}
                  disabled={isCreatingZip}
                  className="btn btn-primary py-2 px-4"
                >
                  {isCreatingZip ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Creating...
                    </span>
                  ) : (
                    'Download ZIP'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <button
          onClick={handleTransferMore}
          className="btn btn-primary w-full"
        >
          Transfer More
        </button>
        <button
          onClick={handleDone}
          className="btn btn-secondary w-full"
        >
          Done
        </button>
      </div>
    </div>
  );
}
