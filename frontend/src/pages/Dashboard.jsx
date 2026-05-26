import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import {
  Trophy,
  AlertCircle,
  Plus,
  UserPlus,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalSolved: 0,
    totalPending: 0,
    progressPercentage: 0,
    pendingProblems: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  
  // Lists summary for create/join operations
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/users/dashboard');
      setStats(statsRes.data);
      const listsRes = await api.get('/lists');
      setLists(listsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateList = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSuccessMsg('');
    if (!newListName.trim()) return;

    try {
      const res = await api.post('/lists', { name: newListName });
      setSuccessMsg(`List "${res.data.name}" created successfully! Invite Code: ${res.data.inviteCode}`);
      setNewListName('');
      fetchDashboardData();
    } catch (error) {
      setCreateError(error.response?.data?.message || 'Failed to create list');
    }
  };

  const handleJoinList = async (e) => {
    e.preventDefault();
    setJoinError('');
    setSuccessMsg('');
    if (!inviteCode.trim()) return;

    try {
      const res = await api.post('/lists/join', { inviteCode });
      setSuccessMsg(`Joined list "${res.data.list.name}" successfully!`);
      setInviteCode('');
      fetchDashboardData();
    } catch (error) {
      setJoinError(error.response?.data?.message || 'Failed to join list');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero banner */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-dark-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Track problem solves, review DP grids, and keep competing with your friends.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Quick list info count */}
          <div className="bg-[#0B0E17]/60 border border-dark-border px-4 py-2.5 rounded-xl text-center flex-1 md:flex-initial min-w-[100px]">
            <p className="text-zinc-500 text-xs uppercase font-semibold">Active Lists</p>
            <p className="text-xl font-bold mt-0.5 text-indigo-400">{lists.length}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Solved */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Total Solved</p>
            <h3 className="text-2xl font-black mt-0.5 text-zinc-100">{stats.totalSolved}</h3>
          </div>
        </div>

        {/* Pending Problems */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Pending Solves</p>
            <h3 className="text-2xl font-black mt-0.5 text-zinc-100">{stats.totalPending}</h3>
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl">
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Completion Rate</p>
            <span className="text-sm font-extrabold text-indigo-400">{stats.progressPercentage}%</span>
          </div>
          <div className="w-full bg-[#0B0F19] h-3 rounded-full border border-dark-border overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm leading-relaxed flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* List Creation and Joining Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create List Card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Plus className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold">Create Shared DSA List</h3>
          </div>
          {createError && <p className="text-xs text-rose-400 mb-3">{createError}</p>}
          <form onSubmit={handleCreateList} className="flex gap-3">
            <input
              type="text"
              required
              placeholder="e.g. Rewind 2025 or Graph Problems"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-sm shrink-0 active:scale-95 transition-transform"
            >
              Create
            </button>
          </form>
        </div>

        {/* Join List Card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold">Join Existing Shared List</h3>
          </div>
          {joinError && <p className="text-xs text-rose-400 mb-3">{joinError}</p>}
          <form onSubmit={handleJoinList} className="flex gap-3">
            <input
              type="text"
              required
              maxLength={6}
              placeholder="Enter 6-digit Invite Code (e.g. AX82C1)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-sm uppercase font-semibold"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-sm shrink-0 active:scale-95 transition-transform"
            >
              Join List
            </button>
          </form>
        </div>
      </div>

      {/* Main Grid: Pending problems vs Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pending Problems (Left) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Your Pending Problems
            </h3>
            <span className="text-xs bg-[#1F273E] px-2.5 py-1 rounded-full text-zinc-400 font-medium">
              Top 5
            </span>
          </div>

          <div className="flex-1 space-y-3.5">
            {stats.pendingProblems.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center py-12 text-zinc-500">
                <CheckCircle className="w-10 h-10 text-emerald-500/20 mb-3" />
                <p className="text-sm font-semibold">All caught up!</p>
                <p className="text-xs mt-1 text-zinc-600">No pending problems in your active lists.</p>
              </div>
            ) : (
              stats.pendingProblems.map((prob) => {
                let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (prob.difficulty === 'Medium') {
                  badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                } else if (prob.difficulty === 'Hard') {
                  badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                }

                return (
                  <div
                    key={prob._id}
                    className="flex justify-between items-center p-3.5 bg-[#0B0E17]/60 border border-dark-border/40 rounded-xl hover:border-dark-border transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={prob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-zinc-200 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                        >
                          {prob.title}
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {prob.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">List: <span className="text-zinc-400 font-semibold">{prob.listName}</span></p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activities (Right) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Recent Activity
          </h3>

          <div className="flex-1 space-y-4">
            {stats.recentActivity.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center py-12 text-zinc-500">
                <Trophy className="w-10 h-10 text-indigo-500/20 mb-3" />
                <p className="text-sm font-semibold">No recent activity</p>
                <p className="text-xs mt-1 text-zinc-600">Activities in your lists will show up here.</p>
              </div>
            ) : (
              stats.recentActivity.map((act) => (
                <div key={act._id} className="flex gap-3 items-start text-sm">
                  <Avatar name={act.user.avatar} className="w-8 h-8 rounded-full shrink-0" />
                  <div className="min-w-0">
                    <p className="text-zinc-300 leading-snug">
                      <span className="font-semibold text-zinc-100">{act.user.username}</span>
                      {' added '}
                      <span className="font-semibold text-indigo-400">{act.problemTitle}</span>
                      {' to '}
                      <span className="text-zinc-400 font-medium">{act.listName}</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                      {new Date(act.time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
