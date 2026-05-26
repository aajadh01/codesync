import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { Trophy, Medal, Star, ListTodo } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      // Fetch leaderboard
      const endpoint = selectedList ? `/users/leaderboard?listId=${selectedList}` : '/users/leaderboard';
      const boardRes = await api.get(endpoint);
      setLeaderboard(boardRes.data);
      
      // Fetch lists for filter dropdown
      const listsRes = await api.get('/lists');
      setLists(listsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedList]);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-zinc-300 fill-zinc-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />;
    return <span className="text-zinc-500 font-mono font-bold text-sm w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index) => {
    if (index === 0) return 'border-amber-400/20 bg-amber-400/[0.02]';
    if (index === 1) return 'border-zinc-300/10 bg-zinc-300/[0.01]';
    if (index === 2) return 'border-amber-600/10 bg-amber-600/[0.01]';
    return 'border-dark-border';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with list filter selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-dark-border/60">
        <div>
          <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-indigo-500" />
            Competitive Leaderboard
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            See who has solved the most problems overall and during the active week.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 bg-[#0B0E17]/60 border border-dark-border px-3.5 py-2 rounded-xl">
          <ListTodo className="w-4 h-4 text-zinc-500 shrink-0" />
          <select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="bg-transparent text-sm font-semibold text-zinc-300 focus:outline-none pr-6 cursor-pointer"
          >
            <option value="" className="bg-dark-card">Global Rankings</option>
            {lists.map((l) => (
              <option key={l._id} value={l._id} className="bg-dark-card">
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-xl p-16 text-center text-zinc-500">
          <Trophy className="w-12 h-12 text-zinc-500/10 mx-auto mb-4" />
          <h4 className="font-bold text-zinc-300">No rankings available</h4>
          <p className="text-xs text-zinc-500 mt-1">Join lists and add problems to compute ranking positions.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Column Headers */}
          <div className="grid grid-cols-12 px-6 py-2.5 text-zinc-500 text-xs font-bold uppercase tracking-wider select-none">
            <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
            <div className="col-span-6 sm:col-span-7">User</div>
            <div className="col-span-2 text-center">Weekly Solved</div>
            <div className="col-span-2 text-center">Total Solved</div>
          </div>

          {/* Rankings List */}
          {leaderboard.map((row, index) => (
            <div
              key={row._id}
              className={`grid grid-cols-12 items-center px-6 py-4 bg-dark-card border rounded-xl transition-all hover:translate-x-0.5 duration-200 ${getRankBg(
                index
              )}`}
            >
              {/* Rank */}
              <div className="col-span-2 sm:col-span-1 flex justify-center">
                {getRankIcon(index)}
              </div>

              {/* User */}
              <div className="col-span-6 sm:col-span-7 flex items-center gap-3.5 min-w-0">
                <Avatar name={row.avatar} className="w-9 h-9 rounded-full shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-zinc-200 truncate">{row.username}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Member since {new Date(row.joinedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Weekly Solves */}
              <div className="col-span-2 text-center">
                <span className="inline-block px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/15 rounded text-xs font-bold text-indigo-400 font-mono">
                  {row.weeklySolved}
                </span>
              </div>

              {/* Total Solves */}
              <div className="col-span-2 text-center">
                <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/15 rounded text-xs font-bold text-emerald-400 font-mono">
                  {row.totalSolved}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
