import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle, X, Keyboard, QrCode } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { QRScanner } from '../components/QRScanner';
import { FileList } from '../components/FileList';
import { TransferProgress } from '../components/TransferProgress';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { usePeer } from '../contexts/PeerContext';
import { useTransferStore } from '../store/transferStore';
import type {
  FileMetadata,
  FileOfferPayload,
  FileChunkPayload,
  FileCompletePayload,
  PeerMessage,
  TransferSession,
} from '../types';
import { parsePeerId, validatePeerId } from '../utils/peerUtils';
import { reassembleChunks, downloadFile } from '../utils/fileUtils';
import { v4 as uuidv4 } from 'uuid';

type ReceiveStep = 'connect' | 'preview' | 'receiving' | 'complete';
type ConnectMode = 'input' | 'scan';

export function ReceivePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ReceiveStep>('connect');
  const [connectMode, setConnectMode] = useState<ConnectMode>('input');
  const [peerIdInput, setPeerIdInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [incomingFiles, setIncomingFiles] = useState<FileMetadata[]>([]);
  
  const {
    remotePeerId,
    initializePeer,
    connectToPeer,
    sendMessage,
    onMessage,
  } = usePeer();
  
  const { addSession, updateProgress, updateSessionStatus, sessions, addToast } = useTransferStore();
  
  // File chunks storage
  const fileChunksRef = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const fileMetadataRef = useRef<Map<string, FileMetadata>>(new Map());
  const sessionRef = useRef<string | null>(null);
  
  // Initialize peer on mount
  useEffect(() => {
    initializePeer();
  }, [initializePeer]);
  
  // Handle incoming messages
  useEffect(() => {
    onMessage.current = (message: PeerMessage) => {
      console.log('ReceivePage received message:', message);
      
      switch (message.type) {
        case 'file-offer': {
          const payload = message.payload as FileOfferPayload;
          setIncomingFiles(payload.files);
          
          // Store metadata for later
          payload.files.forEach(file => {
            fileMetadataRef.current.set(file.id, file);
            fileChunksRef.current.set(file.id, new Array(file.chunks));
          });
          
          setStep('preview');
          break;
        }
        
        case 'file-chunk': {
          const payload = message.payload as FileChunkPayload;
          const chunks = fileChunksRef.current.get(payload.fileId);
          
          if (chunks) {
            chunks[payload.chunkIndex] = payload.data;
            
            // Update progress
            const received = chunks.filter(c => c != null).length;
            const total = payload.totalChunks;
            const file = fileMetadataRef.current.get(payload.fileId);
            
            if (sessionRef.current && file) {
              const bytesTransferred = Math.min(received * 64 * 1024, file.size);
              updateProgress(sessionRef.current, payload.fileId, {
                bytesTransferred,
                percentage: (received / total) * 100,
                status: 'transferring',
              });
            }
          }
          break;
        }
        
        case 'file-complete': {
          const payload = message.payload as FileCompletePayload;
          const chunks = fileChunksRef.current.get(payload.fileId);
          const metadata = fileMetadataRef.current.get(payload.fileId);
          
          if (chunks && metadata && sessionRef.current) {
            // Update progress to complete
            updateProgress(sessionRef.current, payload.fileId, {
              bytesTransferred: metadata.size,
              percentage: 100,
              status: 'complete',
            });
            
            // Reassemble and download
            const blob = reassembleChunks(chunks, metadata.type);
            downloadFile(blob, metadata.name);
            
            addToast({ type: 'success', message: `Downloaded: ${metadata.name}` });
          }
          break;
        }
        
        case 'transfer-complete': {
          if (sessionRef.current) {
            updateSessionStatus(sessionRef.current, 'complete');
          }
          setStep('complete');
          addToast({ type: 'success', message: 'All files received!' });
          break;
        }
      }
    };
    
    return () => {
      onMessage.current = null;
    };
  }, [updateProgress, updateSessionStatus, addToast]);
  
  // Handle peer ID input
  const handlePeerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPeerIdInput(value.slice(0, 6));
    setInputError('');
  };
  
  // Connect to peer
  const handleConnect = async () => {
    const validation = validatePeerId(peerIdInput);
    if (!validation.valid) {
      setInputError(validation.error || 'Invalid code');
      return;
    }
    
    const targetId = parsePeerId(peerIdInput);
    setIsConnecting(true);
    setInputError('');
    
    try {
      await connectToPeer(targetId);
    } catch (err) {
      setInputError((err as Error).message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handle QR scan
  const handleQRScan = async (scannedPeerId: string) => {
    setIsConnecting(true);
    
    try {
      await connectToPeer(scannedPeerId);
    } catch (err) {
      addToast({ type: 'error', message: 'Connection failed' });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Accept files
  const handleAccept = useCallback(() => {
    sendMessage('file-accept', {});
    
    // Create transfer session
    const sessionId = uuidv4();
    sessionRef.current = sessionId;
    
    const session: TransferSession = {
      id: sessionId,
      direction: 'receive',
      files: incomingFiles,
      progress: new Map(),
      overallProgress: 0,
      startTime: Date.now(),
      status: 'in-progress',
    };
    
    // Initialize progress for all files
    incomingFiles.forEach(file => {
      session.progress.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        bytesTransferred: 0,
        totalBytes: file.size,
        percentage: 0,
        speed: 0,
        status: 'pending',
      });
    });
    
    addSession(session);
    setStep('receiving');
  }, [incomingFiles, sendMessage, addSession]);
  
  // Decline files
  const handleDecline = useCallback(() => {
    sendMessage('file-reject', {});
    setIncomingFiles([]);
    setStep('connect');
    addToast({ type: 'info', message: 'Transfer declined' });
  }, [sendMessage, addToast]);
  
  // Get current session
  const currentSession = sessionRef.current ? sessions.get(sessionRef.current) : null;
  
  return (
    <Layout showBack title="Receive Files">
      <div className="max-w-xl mx-auto animate-fade-in">
        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex rounded-xl bg-surface-800 p-1">
              <button
                onClick={() => setConnectMode('input')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                  font-medium transition-all
                  ${connectMode === 'input' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-surface-400 hover:text-surface-200'}
                `}
              >
                <Keyboard className="w-5 h-5" />
                Enter Code
              </button>
              <button
                onClick={() => setConnectMode('scan')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                  font-medium transition-all
                  ${connectMode === 'scan' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-surface-400 hover:text-surface-200'}
                `}
              >
                <QrCode className="w-5 h-5" />
                Scan QR
              </button>
            </div>
            
            <Card>
              {connectMode === 'input' ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-surface-100 mb-2">
                    Enter Connection Code
                  </h2>
                  <p className="text-surface-400 mb-6">
                    Ask the sender for their 6-digit code
                  </p>
                  
                  <input
                    type="text"
                    value={peerIdInput}
                    onChange={handlePeerIdChange}
                    placeholder="ABC123"
                    maxLength={6}
                    className={`
                      w-full max-w-xs mx-auto block
                      text-center text-3xl font-mono font-bold tracking-[0.5em]
                      bg-surface-800 border-2 rounded-xl
                      py-4 px-6
                      placeholder:text-surface-600 placeholder:tracking-[0.3em]
                      focus:outline-none focus:border-primary-500
                      transition-colors
                      ${inputError ? 'border-error-500' : 'border-surface-700'}
                    `}
                  />
                  
                  {inputError && (
                    <p className="text-error-400 text-sm mt-2">{inputError}</p>
                  )}
                  
                  <Button
                    className="mt-6"
                    size="lg"
                    onClick={handleConnect}
                    loading={isConnecting}
                    disabled={peerIdInput.length !== 6}
                    icon={<Download className="w-5 h-5" />}
                  >
                    Connect
                  </Button>
                </div>
              ) : (
                <QRScanner onScan={handleQRScan} />
              )}
            </Card>
          </div>
        )}
        
        {/* Step 2: Preview */}
        {step === 'preview' && (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-primary-400" />
              <div>
                <h2 className="text-lg font-semibold text-surface-100">
                  Incoming Files
                </h2>
                <p className="text-sm text-surface-400">
                  From: {remotePeerId}
                </p>
              </div>
            </div>
            
            <FileList files={incomingFiles} showRemove={false} />
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleDecline}
                icon={<X className="w-5 h-5" />}
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                icon={<CheckCircle className="w-5 h-5" />}
              >
                Accept
              </Button>
            </div>
          </Card>
        )}
        
        {/* Step 3: Receiving */}
        {step === 'receiving' && currentSession && (
          <Card>
            <TransferProgress session={currentSession} />
          </Card>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && currentSession && (
          <Card className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-surface-100 mb-2">
              Files Received!
            </h2>
            <p className="text-surface-400 mb-6">
              All files have been downloaded to your device.
            </p>
            
            <TransferProgress session={currentSession} />
            
            <Button
              className="mt-6"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
