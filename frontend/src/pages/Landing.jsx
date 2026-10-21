import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { isCodeSyncNativeApp } from '../utils/isNativeApp';
import {
  Code2,
  Users,
  Trophy,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Smartphone,
  Download,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Check,
} from 'lucide-react';

const Landing = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [downloadState, setDownloadState] = useState('idle'); // 'idle' | 'downloading' | 'completed'

  // If running inside the native Android App wrapper, bypass the landing page entirely
  useEffect(() => {
    if (isCodeSyncNativeApp()) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else if (!loading) {
        navigate('/auth', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleDownload = () => {
    setDownloadState('downloading');
    setTimeout(() => {
      setDownloadState('completed');
    }, 1800);
    setTimeout(() => {
      setDownloadState('idle');
    }, 9000);
  };

  return (
    <div className="min-h-screen bg-dark-base text-zinc-100 flex flex-col selection:bg-indigo-600/40">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Code2 className="w-8 h-8 text-indigo-500" />
          <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
            CODESYNC
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/codesync.apk"
            download="CodeSync-v1.0.1.apk"
            onClick={handleDownload}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-dark-card hover:bg-[#1E2943] text-zinc-300 border border-dark-border transition-colors duration-200"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Android App <span className="text-[10px] text-emerald-400 font-mono">v1.0.1</span></span>
          </a>

          {user ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-indigo-600/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-indigo-600/20"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-10 md:py-20 text-center max-w-5xl mx-auto z-10">
        {/* Version & Device Compatibility Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>v1.0.1 Update: Vivo Y17, Y16 & Low-RAM Stability Active</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl">
          Solve LeetCode Problems <br />
          <span className="bg-gradient-to-r from-indigo-400 via-blue-500 to-emerald-400 bg-clip-text text-transparent">
            Together with Friends
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-zinc-400 text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
          Create shared DSA revision lists, paste LeetCode URLs or problem numbers, track who solved what in real-time, and stay accountable together on mobile and web.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 w-full sm:w-auto">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/25 transition-all duration-200 group active:scale-95"
            >
              Go to Dashboard
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/25 transition-all duration-200 group active:scale-95"
            >
              Start Syncing
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* Primary APK Download CTA */}
          <a
            href="/codesync.apk"
            download="CodeSync-v1.0.1.apk"
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-dark-card hover:bg-[#1E2943] text-zinc-200 rounded-xl font-semibold border border-indigo-500/30 transition-all duration-200 active:scale-95 shadow-lg shadow-black/20"
          >
            <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-100">
                  {downloadState === 'downloading'
                    ? 'Starting Download...'
                    : downloadState === 'completed'
                    ? 'Download Started!'
                    : 'Download APK'}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  v1.0.1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-normal">
                {downloadState === 'completed'
                  ? 'Check notifications to install'
                  : 'Latest Release • 5.56 MB • Vivo & Low-RAM Supported'}
              </p>
            </div>
            {downloadState === 'completed' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
            ) : (
              <Download className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
            )}
          </a>
        </div>

        {/* Live Feedback Banner */}
        {downloadState === 'completed' && (
          <div className="w-full max-w-lg mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between text-left animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>CodeSync-v1.0.1.apk</strong> download started. Once finished, tap the notification to install.</span>
            </div>
          </div>
        )}

        {/* Secondary build link for debug/verification */}
        <p className="text-xs text-zinc-500 mb-12">
          Requires Android 7.0 (API 24) or higher. Also available:{' '}
          <a
            href="/codesync-debug.apk"
            download="CodeSync-v1.0.1-debug.apk"
            className="text-indigo-400 hover:underline"
          >
            Debug APK (7.9 MB)
          </a>
        </p>

        {/* Mockup / Dashboard Preview */}
        <div className="w-full max-w-4xl glass-card rounded-2xl p-4 md:p-6 shadow-2xl relative border border-dark-border overflow-hidden mb-16">
          <div className="flex items-center justify-between mb-4 border-b border-dark-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs text-zinc-500 font-mono bg-[#0B0F19] px-3 py-1 rounded-full border border-dark-border">
              codesync.dev/dashboard
            </div>
            <div className="w-8" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-dark-base p-4 rounded-xl border border-dark-border/40">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Rewind 2025 List</p>
              <h3 className="text-lg font-bold mt-1">Two Sum</h3>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Easy</span>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs text-zinc-400">Solved by 4 / 5 members</span>
              </div>
            </div>
            <div className="bg-dark-base p-4 rounded-xl border border-dark-border/40">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Graph Problems List</p>
              <h3 className="text-lg font-bold mt-1">Course Schedule</h3>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs text-zinc-400">Solved by 2 / 5 members</span>
              </div>
            </div>
            <div className="bg-dark-base p-4 rounded-xl border border-dark-border/40">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">DP Revision List</p>
              <h3 className="text-lg font-bold mt-1">Edit Distance</h3>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Hard</span>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs text-zinc-400">Solved by 0 / 5 members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Release v1.0.1 Highlights Banner */}
        <div className="w-full max-w-4xl bg-[#10172A] border border-indigo-500/30 rounded-2xl p-6 text-left shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Release v1.0.1 Stability Highlights</h3>
              <p className="text-xs text-zinc-400">Engineered for seamless performance on older & low-RAM phones</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="bg-dark-base/80 p-3.5 rounded-xl border border-dark-border/60">
              <span className="font-semibold text-indigo-400 block mb-1">Vivo Y17 & Y16 Compatibility</span>
              Eliminated WindowManager splash inflation crashes and light navigation bar NPEs on FuntouchOS / Android 7–9.
            </div>
            <div className="bg-dark-base/80 p-3.5 rounded-xl border border-dark-border/60">
              <span className="font-semibold text-emerald-400 block mb-1">Low-RAM & PowerVR GPU Fixes</span>
              Safe GPU compositing without forced hardware layers, preventing PowerVR GE8320 crashes and LMK process exits.
            </div>
            <div className="bg-dark-base/80 p-3.5 rounded-xl border border-dark-border/60">
              <span className="font-semibold text-amber-400 block mb-1">2 Home-Screen Widgets</span>
              Quick Add widget to paste problems directly, and Group Focus widget with persistent checkbox solves.
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="bg-dark-sidebar border-t border-dark-border py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Core Platform Features</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Built from the ground up for stability, visual performance, and collaborative execution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-dark-card p-6 rounded-xl border border-dark-border hover:border-indigo-500/40 transition-colors duration-200">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Shared Coding Lists</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Create multiple DSA revision lists and invite your friends instantly with secure alphanumeric list invite codes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-dark-card p-6 rounded-xl border border-dark-border hover:border-blue-500/40 transition-colors duration-200">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Progress Solves</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Mark problems as solved. Instant completion trackers show who has solved it, and which friends are still pending.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-dark-card p-6 rounded-xl border border-dark-border hover:border-emerald-500/40 transition-colors duration-200">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Weekly Leaderboards</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Keep the competitive spirit alive. Ranks are computed both for overall total solves and active weekly solves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 text-center text-zinc-600 text-xs">
        <p>© 2026 CodeSync. Created for premium collaborative DSA tracking.</p>
      </footer>
    </div>
  );
};

export default Landing;
