import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import {
  ListTodo,
  Plus,
  UserPlus,
  Users,
  ChevronRight,
  Code,
  Calendar,
} from 'lucide-react';

const Lists = () => {
  const { user } = useContext(AuthContext);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newListName, setNewListName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLists = async () => {
    try {
      const res = await api.get('/lists');
      setLists(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lists:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!newListName.trim()) return;

    try {
      const res = await api.post('/lists', { name: newListName });
      setSuccessMsg(`List "${res.data.name}" successfully created! Invite code: ${res.data.inviteCode}`);
      setNewListName('');
      fetchLists();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to create list');
    }
  };

  const handleJoinList = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!inviteCode.trim()) return;

    try {
      const res = await api.post('/lists/join', { inviteCode });
      setSuccessMsg(`Joined list "${res.data.list.name}" successfully!`);
      setInviteCode('');
      fetchLists();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to join list');
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
      {/* Header and forms panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-indigo-500" />
            Your Shared LeetCode Lists
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Create collections of problems for specific topics (like DP, Graphs, or revision) and compete with friends.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {(errorMsg || successMsg) && (
        <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
          errorMsg
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {errorMsg || successMsg}
        </div>
      )}

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Lists grid (Left) */}
        <div className="xl:col-span-8 space-y-4">
          {lists.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center text-zinc-500">
              <ListTodo className="w-12 h-12 text-indigo-500/20 mx-auto mb-4" />
              <h3 className="font-bold text-lg text-zinc-300">No shared lists found</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                You haven't joined or created any lists yet. Fill in the forms on the right to start syncing!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lists.map((list) => (
                <div
                  key={list._id}
                  className="bg-dark-card border border-dark-border/80 rounded-xl p-5 hover:border-indigo-500/40 transition-colors flex flex-col justify-between group h-[200px]"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-bold text-base truncate text-zinc-100 group-hover:text-indigo-400 transition-colors">
                        {list.name}
                      </h3>
                    </div>
                    
                    {/* Meta stats */}
                    <div className="flex items-center gap-4 mt-3.5 text-zinc-400 text-xs font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        {list.members.length} {list.members.length === 1 ? 'member' : 'members'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Code className="w-3.5 h-3.5 text-zinc-500" />
                        {list.problemCount} {list.problemCount === 1 ? 'problem' : 'problems'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">Owner:</span>
                      <div className="inline-flex items-center gap-1.5 bg-[#0B0E17]/60 px-2 py-1 rounded-full border border-dark-border">
                        <Avatar name={list.owner.avatar} className="w-4 h-4 rounded-full" />
                        <span className="text-[10px] text-zinc-400 font-semibold">{list.owner.username}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dark-border/40 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">CODE: <span className="text-indigo-400 font-bold">{list.inviteCode}</span></span>
                    <Link
                      to={`/lists/${list._id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-300"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar forms (Right) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Create Form */}
          <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
            <h3 className="text-base font-extrabold mb-1.5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              Create Shared List
            </h3>
            <p className="text-zinc-500 text-xs mb-4">Set up a list to collaborate and track progress with friends.</p>
            <form onSubmit={handleCreateList} className="space-y-3">
              <input
                type="text"
                required
                placeholder="e.g. Rewind 2025"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full bg-[#0B0F19] border border-dark-border focus:border-indigo-500 focus:outline-none rounded-lg px-3.5 py-2 text-sm text-zinc-200"
              />
              <button
                type="submit"
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors active:scale-[0.98]"
              >
                Create List
              </button>
            </form>
          </div>

          {/* Join Form */}
          <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
            <h3 className="text-base font-extrabold mb-1.5 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              Join with Code
            </h3>
            <p className="text-zinc-500 text-xs mb-4">Enter your friend's invite code to join their shared list.</p>
            <form onSubmit={handleJoinList} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="AX82C1"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full bg-[#0B0F19] border border-dark-border focus:border-indigo-500 focus:outline-none rounded-lg px-3.5 py-2 text-sm text-center uppercase font-bold tracking-widest text-indigo-400"
              />
              <button
                type="submit"
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors active:scale-[0.98]"
              >
                Join List
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lists;
