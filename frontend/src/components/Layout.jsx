import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import MobileDownloadButton from './MobileDownloadButton';
import {
  LayoutDashboard,
  ListTodo,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  Code2,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Shared Lists', path: '/lists', icon: ListTodo },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPageTitle = () => {
    const current = menuItems.find((item) => item.path === location.pathname);
    if (current) return current.name;
    if (location.pathname.startsWith('/lists/')) return 'List Details';
    return 'CodeSync';
  };

  return (
    <div className="flex h-screen bg-dark-base text-zinc-100 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-dark-sidebar border-r border-dark-border">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 gap-2 border-b border-dark-border">
          <Code2 className="w-6 h-6 text-indigo-500 animate-pulse" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
            CODESYNC
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/lists' && location.pathname.startsWith('/lists/'));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-zinc-400 hover:bg-dark-card hover:text-zinc-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout at bottom */}
        {user && (
          <div className="p-4 border-t border-dark-border bg-[#0B0E17]/60 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={user.avatar} className="w-10 h-10 ring-2 ring-indigo-500/20 rounded-full" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-zinc-200">{user.username}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-dark-card border border-dark-border text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer (Overlay and Panel) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel */}
          <aside className="relative flex flex-col w-64 bg-dark-sidebar h-full z-10 animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-dark-border">
              <div className="flex items-center gap-2">
                <Code2 className="w-6 h-6 text-indigo-500" />
                <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent">
                  CODESYNC
                </span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path === '/lists' && location.pathname.startsWith('/lists/'));

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:bg-dark-card hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="p-4 border-t border-dark-border flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={user.avatar} className="w-10 h-10" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate">{user.username}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-dark-card border border-dark-border text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-dark-nav border-b border-dark-border z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-zinc-400 hover:text-zinc-100 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold tracking-wide text-zinc-100">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 md:gap-3 bg-[#1A2238] border border-dark-border px-3 py-1.5 rounded-full select-none">
                <Avatar name={user.avatar} className="w-6 h-6" />
                <span className="text-xs font-medium text-zinc-300 hidden sm:inline">{user.username}</span>
              </div>
            )}
          </div>
        </header>
        <MobileDownloadButton />

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto bg-dark-base p-6 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
