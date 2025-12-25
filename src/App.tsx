/**
 * Main App Component - Navigation and state orchestration
 */

import { useState, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import { HomePage } from './pages/HomePage';
import { ReceivePage } from './pages/ReceivePage';
import { SendPage } from './pages/SendPage';
import { TransferPage } from './pages/TransferPage';
import { CompletePage } from './pages/CompletePage';
import type { AppScreen, TransferRole } from './types';
import './index.css';

function AppContent() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [role, setRole] = useState<TransferRole | null>(null);
  const [filesToSend, setFilesToSend] = useState<File[]>([]);

  // Navigation handlers
  const handleNavigateFromHome = useCallback((target: 'send' | 'receive') => {
    setRole(target === 'send' ? 'sender' : 'receiver');
    setScreen(target);
  }, []);

  const handleBack = useCallback(() => {
    setScreen('home');
    setRole(null);
    setFilesToSend([]);
  }, []);

  const handleReceiverConnected = useCallback(() => {
    setScreen('transfer');
  }, []);

  const handleStartTransfer = useCallback((files: File[]) => {
    setFilesToSend(files);
    setScreen('transfer');
  }, []);

  const handleTransferComplete = useCallback(() => {
    setScreen('complete');
  }, []);

  const handleTransferCancel = useCallback(() => {
    setScreen('home');
    setRole(null);
    setFilesToSend([]);
  }, []);

  const handleTransferMore = useCallback(() => {
    if (role === 'sender') {
      setFilesToSend([]);
      setScreen('send');
    } else {
      setScreen('receive');
    }
  }, [role]);

  const handleDone = useCallback(() => {
    setScreen('home');
    setRole(null);
    setFilesToSend([]);
  }, []);

  // Render current screen
  switch (screen) {
    case 'home':
      return <HomePage onNavigate={handleNavigateFromHome} />;
    
    case 'receive':
      return (
        <ReceivePage
          onConnected={handleReceiverConnected}
          onBack={handleBack}
        />
      );
    
    case 'send':
      return (
        <SendPage
          onStartTransfer={handleStartTransfer}
          onBack={handleBack}
        />
      );
    
    case 'transfer':
      return (
        <TransferPage
          files={role === 'sender' ? filesToSend : undefined}
          role={role || 'receiver'}
          onComplete={handleTransferComplete}
          onCancel={handleTransferCancel}
        />
      );
    
    case 'complete':
      return (
        <CompletePage
          role={role || 'receiver'}
          onTransferMore={handleTransferMore}
          onDone={handleDone}
        />
      );
    
    default:
      return <HomePage onNavigate={handleNavigateFromHome} />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
