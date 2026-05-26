import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import Avatar, { avatarsList } from '../components/Avatar';
import api from '../services/api';
import { User, CheckCircle, AlertCircle, Award } from 'lucide-react';

const Profile = () => {
  const { user, changeAvatar } = useContext(AuthContext);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [solvedLogs, setSolvedLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileStats = async () => {
      try {
        // Fetch dashboard again to filter solved problems as a log of solves
        const res = await api.get('/users/dashboard');
        
        // Since we want solved logs, let's fetch all problems in lists and filter those solved by user
        const listsRes = await api.get('/lists');
        const listIds = listsRes.data.map((l) => l._id);
        
        let allSolved = [];
        for (const lid of listIds) {
          const lDetails = await api.get(`/lists/${lid}`);
          const solvedInList = lDetails.data.problems.filter((p) =>
            p.solvedBy.some((u) => u._id.toString() === user._id.toString())
          );
          
          solvedInList.forEach((p) => {
            allSolved.push({
              _id: p._id,
              title: p.title,
              difficulty: p.difficulty,
              url: p.url,
              solvedAt: p.updatedAt,
              listName: lDetails.data.list.name,
            });
          });
        }
        
        // Sort by solvedAt date descending
        allSolved.sort((a, b) => new Date(b.solvedAt) - new Date(a.solvedAt));
        setSolvedLogs(allSolved);
        setLoading(false);
      } catch (err) {
        console.error('Error loading profile stats:', err);
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileStats();
    }
  }, [user]);

  const handleAvatarChange = async (avatarId) => {
    setSuccessMsg('');
    setErrorMsg('');
    const res = await changeAvatar(avatarId);
    if (res.success) {
      setSuccessMsg('Avatar updated successfully!');
    } else {
      setErrorMsg(res.message);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Notifications */}
      {(successMsg || errorMsg) && (
        <div className={`p-4 rounded-xl border text-sm ${
          errorMsg
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {errorMsg || successMsg}
        </div>
      )}

      {/* Profile Info Header */}
      <div className="bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
        <Avatar name={user.avatar} className="w-20 h-20 rounded-full border-2 border-indigo-500/20" />
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-black text-zinc-100">{user.username}</h2>
          <p className="text-zinc-500 text-sm mt-1">{user.email}</p>
          <div className="flex gap-4 mt-4 justify-center sm:justify-start">
            <div className="bg-[#0B0F19] px-3.5 py-1.5 rounded-lg border border-dark-border flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-zinc-300 font-bold">{solvedLogs.length} Solved</span>
            </div>
            <div className="bg-[#0B0F19] px-3.5 py-1.5 rounded-lg border border-dark-border flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-zinc-300 font-bold">LeetCoder</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Avatar Select Box (Left) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h3 className="text-base font-extrabold mb-4 text-zinc-100 border-b border-dark-border/60 pb-3">
            Change Your Avatar
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {avatarsList.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarChange(avatar.id)}
                className={`aspect-square rounded-full p-1 border-2 flex items-center justify-center transition-all relative ${
                  user.avatar === avatar.id
                    ? 'border-indigo-500 scale-105 bg-indigo-500/10'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                <Avatar name={avatar.id} className="w-full h-full rounded-full" />
              </button>
            ))}
          </div>
        </div>

        {/* Recently Solved Logs (Right) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col">
          <h3 className="text-base font-extrabold mb-4 text-zinc-100 border-b border-dark-border/60 pb-3">
            Solved Problems Log
          </h3>

          <div className="flex-1 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : solvedLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                <CheckCircle className="w-8 h-8 text-zinc-600/25 mx-auto mb-2" />
                No solved problems logged yet. Go mark some solved!
              </div>
            ) : (
              solvedLogs.map((log) => {
                let badge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (log.difficulty === 'Medium') {
                  badge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                } else if (log.difficulty === 'Hard') {
                  badge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                }

                return (
                  <div
                    key={log._id}
                    className="flex justify-between items-center p-3 bg-[#0B0E17]/60 border border-dark-border/40 rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={log.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold hover:text-indigo-400 hover:underline transition-colors text-zinc-200"
                        >
                          {log.title}
                        </a>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>
                          {log.difficulty}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        List: <span className="text-zinc-400 font-medium">{log.listName}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(log.solvedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
