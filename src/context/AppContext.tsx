/**
 * AppContext - Global state management for the application
 * Uses React Context with a reducer for immutable state updates
 */

import React, { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import type {
  AppState,
  AppAction,
  AppScreen,
  TransferRole,
  ConnectionState,
  TransferProgress,
  OverallProgress,
  TransferFile,
} from '../types';

// ============================================
// Initial State
// ============================================

const initialState: AppState = {
  screen: 'home',
  role: null,
  connection: {
    state: 'idle',
    localPeerId: null,
    remotePeerId: null,
    error: null,
    retryCount: 0,
  },
  transfers: new Map(),
  overallProgress: null,
  receivedFiles: [],
  error: null,
};

// ============================================
// Reducer
// ============================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connection: { ...state.connection, state: action.state },
      };

    case 'SET_LOCAL_PEER_ID':
      return {
        ...state,
        connection: { ...state.connection, localPeerId: action.peerId },
      };

    case 'SET_REMOTE_PEER_ID':
      return {
        ...state,
        connection: { ...state.connection, remotePeerId: action.peerId },
      };

    case 'SET_CONNECTION_ERROR':
      return {
        ...state,
        connection: { ...state.connection, error: action.error, state: 'error' },
      };

    case 'INCREMENT_RETRY':
      return {
        ...state,
        connection: { ...state.connection, retryCount: state.connection.retryCount + 1 },
      };

    case 'RESET_CONNECTION':
      return {
        ...state,
        connection: {
          state: 'idle',
          localPeerId: state.connection.localPeerId,
          remotePeerId: null,
          error: null,
          retryCount: 0,
        },
      };

    case 'ADD_TRANSFER': {
      const newTransfers = new Map(state.transfers);
      newTransfers.set(action.progress.fileId, action.progress);
      return { ...state, transfers: newTransfers };
    }

    case 'UPDATE_TRANSFER': {
      const existingTransfer = state.transfers.get(action.fileId);
      if (!existingTransfer) return state;
      
      const newTransfers = new Map(state.transfers);
      newTransfers.set(action.fileId, { ...existingTransfer, ...action.update });
      return { ...state, transfers: newTransfers };
    }

    case 'REMOVE_TRANSFER': {
      const newTransfers = new Map(state.transfers);
      newTransfers.delete(action.fileId);
      return { ...state, transfers: newTransfers };
    }

    case 'UPDATE_OVERALL_PROGRESS':
      return { ...state, overallProgress: action.progress };

    case 'ADD_RECEIVED_FILE':
      return { ...state, receivedFiles: [...state.receivedFiles, action.file] };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'RESET_STATE':
      return {
        ...initialState,
        connection: {
          ...initialState.connection,
          localPeerId: state.connection.localPeerId,
        },
      };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setScreen: (screen: AppScreen) => void;
  setRole: (role: TransferRole) => void;
  setConnectionState: (state: ConnectionState) => void;
  setLocalPeerId: (peerId: string) => void;
  setRemotePeerId: (peerId: string) => void;
  setError: (error: string | null) => void;
  addTransfer: (progress: TransferProgress) => void;
  updateTransfer: (fileId: string, update: Partial<TransferProgress>) => void;
  addReceivedFile: (file: TransferFile) => void;
  updateOverallProgress: (progress: OverallProgress) => void;
  resetState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = useMemo<AppContextValue>(() => ({
    state,
    dispatch,
    setScreen: (screen) => dispatch({ type: 'SET_SCREEN', screen }),
    setRole: (role) => dispatch({ type: 'SET_ROLE', role }),
    setConnectionState: (state) => dispatch({ type: 'SET_CONNECTION_STATE', state }),
    setLocalPeerId: (peerId) => dispatch({ type: 'SET_LOCAL_PEER_ID', peerId }),
    setRemotePeerId: (peerId) => dispatch({ type: 'SET_REMOTE_PEER_ID', peerId }),
    setError: (error) => dispatch({ type: 'SET_ERROR', error }),
    addTransfer: (progress) => dispatch({ type: 'ADD_TRANSFER', progress }),
    updateTransfer: (fileId, update) => dispatch({ type: 'UPDATE_TRANSFER', fileId, update }),
    addReceivedFile: (file) => dispatch({ type: 'ADD_RECEIVED_FILE', file }),
    updateOverallProgress: (progress) => dispatch({ type: 'UPDATE_OVERALL_PROGRESS', progress }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  }), [state]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
