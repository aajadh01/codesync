import React from 'react';
import { Code2 } from 'lucide-react';

const AppLoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] text-zinc-100 select-none">
      <div className="flex items-center gap-2 mb-6">
        <Code2 className="w-10 h-10 text-indigo-500 animate-pulse" />
        <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
          CODESYNC
        </span>
      </div>
      <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-xs text-zinc-500 mt-4 font-medium tracking-wide">
        Connecting...
      </span>
    </div>
  );
};

export default AppLoadingScreen;
