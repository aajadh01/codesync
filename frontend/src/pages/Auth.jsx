import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Avatar, { avatarsList } from '../components/Avatar';
import { Code2, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

const Auth = () => {
  const { user, login, register, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar1');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message);
      }
    } else {
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        setFormLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setFormLoading(false);
        return;
      }
      const res = await register(username, email, password, selectedAvatar);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message);
      }
    }
    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-base flex flex-col justify-center items-center p-6 relative selection:bg-indigo-600/40">
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Brand logo back link */}
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <Code2 className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
        <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
          CODESYNC
        </span>
      </Link>

      {/* Glowing Outer Card */}
      <div className="w-full max-w-lg bg-dark-card border border-dark-border/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Toggle tabs */}
        <div className="flex border-b border-dark-border/60 pb-4 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 text-center font-bold text-sm pb-2 transition-colors ${
              isLogin ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 text-center font-bold text-sm pb-2 transition-colors ${
              !isLogin ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Header Text */}
        <h2 className="text-xl font-bold mb-1 text-zinc-100">
          {isLogin ? 'Welcome Back!' : 'Join the CodeSync Community'}
        </h2>
        <p className="text-zinc-500 text-xs mb-6">
          {isLogin ? 'Enter your credentials to sync with friends' : 'Select an avatar and sign up to begin'}
        </p>

        {/* Error alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs leading-relaxed animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. codemaster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-200 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-200 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-200 transition-colors"
              />
            </div>
          </div>

          {/* Avatar grid selection when registering */}
          {!isLogin && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Choose Avatar
              </label>
              <div className="grid grid-cols-4 gap-3 bg-[#0B0F19] p-3.5 rounded-lg border border-dark-border/60">
                {avatarsList.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`aspect-square rounded-full flex items-center justify-center p-1 border-2 transition-all relative ${
                      selectedAvatar === avatar.id
                        ? 'border-indigo-500 scale-105 bg-indigo-500/10'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <Avatar name={avatar.id} className="w-full h-full rounded-full" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={formLoading || loading}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/15 transition-all duration-200 active:scale-98 disabled:opacity-50 mt-6"
          >
            {formLoading || loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
