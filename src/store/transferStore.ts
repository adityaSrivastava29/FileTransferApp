import { create } from 'zustand';
import type { TransferProgress, TransferSession, TransferStatus } from '../types';

interface TransferState {
  // Sessions
  sessions: Map<string, TransferSession>;
  activeSessionId: string | null;
  
  // Toast notifications
  toasts: Toast[];
  
  // Actions
  addSession: (session: TransferSession) => void;
  updateSessionStatus: (sessionId: string, status: TransferSession['status']) => void;
  updateProgress: (sessionId: string, fileId: string, progress: Partial<TransferProgress>) => void;
  setOverallProgress: (sessionId: string, progress: number) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  clearSessions: () => void;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

let toastId = 0;

export const useTransferStore = create<TransferState>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  toasts: [],
  
  addSession: (session) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(session.id, session);
      return { sessions: newSessions, activeSessionId: session.id };
    });
  },
  
  updateSessionStatus: (sessionId, status) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;
      
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, status });
      return { sessions: newSessions };
    });
  },
  
  updateProgress: (sessionId, fileId, progressUpdate) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;
      
      const newProgress = new Map(session.progress);
      const existing = newProgress.get(fileId);
      
      if (existing) {
        newProgress.set(fileId, { ...existing, ...progressUpdate });
      } else {
        // Create new progress entry
        const file = session.files.find(f => f.id === fileId);
        if (file) {
          newProgress.set(fileId, {
            fileId,
            fileName: file.name,
            bytesTransferred: 0,
            totalBytes: file.size,
            percentage: 0,
            speed: 0,
            status: 'pending' as TransferStatus,
            ...progressUpdate,
          });
        }
      }
      
      // Calculate overall progress
      let totalBytes = 0;
      let transferredBytes = 0;
      newProgress.forEach((p) => {
        totalBytes += p.totalBytes;
        transferredBytes += p.bytesTransferred;
      });
      
      const overallProgress = totalBytes > 0 ? (transferredBytes / totalBytes) * 100 : 0;
      
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { 
        ...session, 
        progress: newProgress,
        overallProgress,
      });
      
      return { sessions: newSessions };
    });
  },
  
  setOverallProgress: (sessionId, progress) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;
      
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, overallProgress: progress });
      return { sessions: newSessions };
    });
  },
  
  removeSession: (sessionId) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(sessionId);
      return { 
        sessions: newSessions,
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      };
    });
  },
  
  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },
  
  clearSessions: () => {
    set({ sessions: new Map(), activeSessionId: null });
  },
  
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  },
}));
