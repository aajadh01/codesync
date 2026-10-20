import React, { useState } from 'react';
import { Smartphone, Download, HelpCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const MobileDownloadButton = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="md:hidden mx-4 my-3 bg-[#131B2E] border border-indigo-500/30 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-100">CodeSync Android App</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Native Android APK • 4.5 MB</p>
          </div>
        </div>

        <a
          href="/codesync.apk"
          download="codesync.apk"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-md transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </a>
      </div>

      {/* Installation help toggle */}
      <div className="mt-2.5 pt-2 border-t border-dark-border/60 flex items-center justify-between text-xs text-zinc-400">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How to install APK</span>
          {showInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <span className="text-[10px] text-zinc-500">Android 7.0+</span>
      </div>

      {showInstructions && (
        <div className="mt-2.5 p-2.5 bg-dark-base/80 rounded-lg border border-dark-border text-[11px] text-zinc-300 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-indigo-400">1.</span>
            <span>Tap <strong>Download</strong> above to save <code>codesync.apk</code>.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-indigo-400">2.</span>
            <span>Tap the downloaded notification or locate the file in your <strong>Downloads</strong> folder.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-indigo-400">3.</span>
            <span>If prompted, tap <strong>Settings</strong> and allow <em>Install unknown apps</em> for your browser.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-emerald-400">4.</span>
            <span>Tap <strong>Install</strong>, then open CodeSync to track DSA progress!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDownloadButton;
