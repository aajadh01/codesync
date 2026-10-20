import React, { useState, useEffect } from 'react';
import { Smartphone, Download, HelpCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

const MobileDownloadButton = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('codesync_apk_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [isInApp, setIsInApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const ua = navigator.userAgent || '';
      const isWebView = /CodeSyncApp|;\s*wv\b|Version\/[0-9.]+\s+Chrome/i.test(ua);
      const hasNativeBridge = Boolean(window.CodeSyncNative) || Boolean(window.isCodeSyncApp);
      const hasInAppStorage = localStorage.getItem('codesync_in_app') === 'true';
      return isWebView || hasNativeBridge || hasInAppStorage;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkNative = () => {
      try {
        const ua = navigator.userAgent || '';
        const isApp =
          Boolean(window.CodeSyncNative) ||
          Boolean(window.isCodeSyncApp) ||
          localStorage.getItem('codesync_in_app') === 'true' ||
          /CodeSyncApp|;\s*wv\b|Version\/[0-9.]+\s+Chrome/i.test(ua);

        if (isApp) {
          setIsInApp(true);
        }
      } catch {}
    };

    checkNative();
    const timer = setTimeout(checkNative, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('codesync_apk_banner_dismissed', 'true');
    } catch {}
  };

  // If the user is running inside the native Android app, or has dismissed the prompt, hide it
  if (isInApp || dismissed) {
    return null;
  }

  return (
    <div className="md:hidden mx-4 my-3 bg-[#131B2E] border border-indigo-500/30 rounded-xl p-3 shadow-lg relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded-md"
        aria-label="Dismiss banner"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-between gap-3 pr-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-100">CodeSync Android App</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Native Android APK • 5.5 MB</p>
          </div>
        </div>

        <a
          href="/codesync.apk"
          download="codesync.apk"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md transition-all shrink-0"
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
            <span>Tap <strong>Install</strong>, then open CodeSync to track DSA progress with interactive home-screen widgets!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDownloadButton;
