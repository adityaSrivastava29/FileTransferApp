import { useEffect, useState, useCallback, useRef } from 'react';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PeerIdDisplay } from '../components/PeerIdDisplay';
import { FilePicker } from '../components/FilePicker';
import { FileList } from '../components/FileList';
import { TransferProgress } from '../components/TransferProgress';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { usePeer } from '../contexts/PeerContext';
import { useTransferStore } from '../store/transferStore';
import { CHUNK_SIZE } from '../types';
import type { 
  FileWithMetadata, 
  FileOfferPayload, 
  FileChunkPayload, 
  PeerMessage,
  TransferSession,
} from '../types';
import { createFileMetadata, chunkFile } from '../utils/fileUtils';
import { v4 as uuidv4 } from 'uuid';

type SendStep = 'waiting' | 'selecting' | 'transferring' | 'complete';

export function SendPage() {
  const [step, setStep] = useState<SendStep>('waiting');
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const { 
    peerId, 
    status, 
    remotePeerId,
    initializePeer, 
    sendMessage, 
    onMessage,
  } = usePeer();
  
  const { addSession, updateProgress, updateSessionStatus, sessions, addToast } = useTransferStore();
  const sessionRef = useRef<string | null>(null);
  
  // Initialize peer on mount
  useEffect(() => {
    initializePeer();
  }, [initializePeer]);
  
  // Transition to file selection when connected
  useEffect(() => {
    if (status === 'connected' && step === 'waiting') {
      setStep('selecting');
      addToast({ type: 'success', message: 'Receiver connected! Select files to send.' });
    }
  }, [status, step, addToast]);
  
  // Handle incoming messages
  useEffect(() => {
    onMessage.current = (message: PeerMessage) => {
      console.log('SendPage received message:', message);
      
      if (message.type === 'file-accept') {
        // Start the transfer
        startTransfer();
      } else if (message.type === 'file-reject') {
        addToast({ type: 'error', message: 'Receiver declined the files' });
        setIsTransferring(false);
      }
    };
    
    return () => {
      onMessage.current = null;
    };
  }, [files, addToast]);
  
  // Handle file selection
  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const filesWithMetadata: FileWithMetadata[] = selectedFiles.map(file => ({
      file,
      metadata: createFileMetadata(file),
    }));
    
    setFiles(prev => [...prev, ...filesWithMetadata]);
  }, []);
  
  // Remove file
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.metadata.id !== fileId));
  }, []);
  
  // Send file offer
  const handleSendOffer = useCallback(() => {
    if (files.length === 0) return;
    
    const fileMetadataList = files.map(f => f.metadata);
    const totalSize = files.reduce((sum, f) => sum + f.metadata.size, 0);
    
    const payload: FileOfferPayload = {
      files: fileMetadataList,
      totalSize,
    };
    
    sendMessage('file-offer', payload);
    setIsTransferring(true);
    addToast({ type: 'info', message: 'Waiting for receiver to accept...' });
  }, [files, sendMessage, addToast]);
  
  // Start the actual transfer
  const startTransfer = useCallback(async () => {
    setStep('transferring');
    
    // Create transfer session
    const sessionId = uuidv4();
    sessionRef.current = sessionId;
    
    const session: TransferSession = {
      id: sessionId,
      direction: 'send',
      files: files.map(f => f.metadata),
      progress: new Map(),
      overallProgress: 0,
      startTime: Date.now(),
      status: 'in-progress',
    };
    
    addSession(session);
    
    // Transfer each file
    for (const fileWithMeta of files) {
      const { file, metadata } = fileWithMeta;
      
      // Initialize progress for this file
      updateProgress(sessionId, metadata.id, {
        fileId: metadata.id,
        fileName: metadata.name,
        bytesTransferred: 0,
        totalBytes: metadata.size,
        percentage: 0,
        speed: 0,
        status: 'transferring',
      });
      
      // Chunk and send
      const chunked = await chunkFile(file);
      let startTime = Date.now();
      let bytesInWindow = 0;
      
      for (let i = 0; i < chunked.chunks.length; i++) {
        const chunkPayload: FileChunkPayload = {
          fileId: metadata.id,
          chunkIndex: i,
          totalChunks: chunked.chunks.length,
          data: chunked.chunks[i],
        };
        
        sendMessage('file-chunk', chunkPayload);
        
        // Update progress
        const bytesTransferred = (i + 1) * CHUNK_SIZE;
        const actualBytes = Math.min(bytesTransferred, metadata.size);
        bytesInWindow += chunked.chunks[i].byteLength;
        
        const elapsed = Date.now() - startTime;
        const speed = elapsed > 0 ? (bytesInWindow / elapsed) * 1000 : 0;
        
        updateProgress(sessionId, metadata.id, {
          bytesTransferred: actualBytes,
          percentage: (actualBytes / metadata.size) * 100,
          speed,
        });
        
        // Reset speed calculation window periodically
        if (elapsed > 1000) {
          startTime = Date.now();
          bytesInWindow = 0;
        }
        
        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Mark file as complete
      updateProgress(sessionId, metadata.id, {
        bytesTransferred: metadata.size,
        percentage: 100,
        status: 'complete',
      });
      
      sendMessage('file-complete', { fileId: metadata.id });
    }
    
    // All files transferred
    sendMessage('transfer-complete', {});
    updateSessionStatus(sessionId, 'complete');
    setStep('complete');
    addToast({ type: 'success', message: 'All files sent successfully!' });
  }, [files, addSession, updateProgress, updateSessionStatus, sendMessage, addToast]);
  
  // Get current session
  const currentSession = sessionRef.current ? sessions.get(sessionRef.current) : null;
  
  return (
    <Layout showBack title="Send Files">
      <div className="max-w-xl mx-auto animate-fade-in">
        {/* Step 1: Waiting for connection */}
        {step === 'waiting' && (
          <Card className="text-center py-8">
            <h2 className="text-2xl font-bold text-surface-100 mb-6">
              Share Your Connection Code
            </h2>
            
            <PeerIdDisplay 
              peerId={peerId} 
              loading={status === 'connecting'} 
            />
            
            <div className="mt-8 flex items-center justify-center gap-2 text-surface-400">
              <Loader2 className="w-5 h-5 spinner" />
              <span>Waiting for receiver to connect...</span>
            </div>
          </Card>
        )}
        
        {/* Step 2: File Selection */}
        {step === 'selecting' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-success-400" />
                <div>
                  <h2 className="text-lg font-semibold text-surface-100">
                    Connected to Receiver
                  </h2>
                  <p className="text-sm text-surface-400">
                    Peer: {remotePeerId}
                  </p>
                </div>
              </div>
              
              <FilePicker onFilesSelected={handleFilesSelected} />
            </Card>
            
            {files.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-surface-100 mb-4">
                  Selected Files
                </h3>
                <FileList 
                  files={files} 
                  onRemove={handleRemoveFile}
                />
                
                <div className="mt-6">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleSendOffer}
                    loading={isTransferring}
                    icon={<Send className="w-5 h-5" />}
                  >
                    {isTransferring ? 'Waiting for acceptance...' : 'Send Files'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
        
        {/* Step 3: Transferring */}
        {step === 'transferring' && currentSession && (
          <Card>
            <TransferProgress session={currentSession} />
          </Card>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && currentSession && (
          <Card className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-surface-100 mb-2">
              Transfer Complete!
            </h2>
            <p className="text-surface-400 mb-6">
              All files have been sent successfully.
            </p>
            
            <TransferProgress session={currentSession} />
          </Card>
        )}
      </div>
    </Layout>
  );
}
