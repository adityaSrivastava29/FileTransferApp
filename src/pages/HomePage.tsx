/**
 * HomePage - Landing screen with Send/Receive options
 */

interface HomePageProps {
  onNavigate: (screen: 'send' | 'receive') => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="page items-center justify-center text-center animate-fadeIn">
      {/* Logo / Branding */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2">ShareDrop</h1>
        <p className="text-[var(--color-text-secondary)]">
          Instant P2P file transfer
        </p>
      </div>

      {/* Feature highlights */}
      <div className="flex justify-center gap-6 mb-10 text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>No cloud</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Original quality</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Fast</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-4 w-full max-w-xs">
        <button
          onClick={() => onNavigate('send')}
          className="btn btn-primary w-full text-lg py-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Send Files
        </button>

        <button
          onClick={() => onNavigate('receive')}
          className="btn btn-secondary w-full text-lg py-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Receive Files
        </button>
      </div>

      {/* How it works */}
      <div className="mt-12 text-sm text-[var(--color-text-muted)]">
        <p>Scan QR code to connect devices</p>
        <p className="mt-1">Works on iOS Safari & Android Chrome</p>
      </div>
    </div>
  );
}
