import React, { useState } from 'react';
import { WifiOff, RotateCw, LogOut, Code2 } from 'lucide-react';

const AppNetworkErrorScreen = ({ onRetry, onLogout }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] text-zinc-100 p-6 text-center select-none">
      <div className="flex items-center gap-2 mb-8">
        <Code2 className="w-8 h-8 text-indigo-500" />
        <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
          CODESYNC
        </span>
      </div>

      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/5">
        <WifiOff className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold mb-2 text-zinc-100">Unable to Connect</h2>
      <p className="text-zinc-400 text-xs max-w-sm mb-6 leading-relaxed">
        Could not reach CodeSync servers. Your saved login session is preserved safely on this device.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Connecting...' : 'Retry Connection'}</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-dark-card hover:bg-[#1E2943] text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold border border-dark-border transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign in with another account</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AppNetworkErrorScreen;
