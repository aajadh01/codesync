import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import {
  ArrowLeft,
  Users,
  Code2,
  Plus,
  ExternalLink,
  CheckCircle,
  Clock,
  Search,
  Filter,
  X,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

const ListDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [list, setList] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [diffFilter, setDiffFilter] = useState('All');

  // Add problem modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [problemInput, setProblemInput] = useState(''); // Holds pasted URL or problem number
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDifficulty, setProblemDifficulty] = useState('Easy');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchListDetails = async () => {
    try {
      const res = await api.get(`/lists/${id}`);
      setList(res.data.list);
      setProblems(res.data.problems);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching list details:', error);
      setError(error.response?.data?.message || 'Failed to load list details');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListDetails();
  }, [id]);

  // Clean LeetCode url to auto-generate title
  const handleProblemInputBlur = () => {
    if (!problemInput.trim()) return;

    let input = problemInput.trim();
    // Check if it's a URL
    if (input.includes('leetcode.com/problems/')) {
      try {
        // Extract the slug
        // e.g. https://leetcode.com/problems/two-sum/description/
        const parts = input.split('leetcode.com/problems/')[1].split('/');
        const slug = parts[0];
        // Format slug to readable title
        const formattedTitle = slug
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (!problemTitle) {
          setProblemTitle(formattedTitle);
        }
      } catch (err) {
        console.error('Failed to parse URL', err);
      }
    } else if (/^\d+$/.test(input)) {
      // It's a problem number
      if (!problemTitle) {
        setProblemTitle(`Problem #${input}`);
      }
    }
  };

  const handleAddProblem = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    if (!problemTitle.trim() || !problemInput.trim()) {
      setModalError('Please fill in both the title and url/number.');
      setModalLoading(false);
      return;
    }

    // Ensure valid URL
    let finalUrl = problemInput.trim();
    if (/^\d+$/.test(finalUrl)) {
      // If it is just a number, make a search URL
      finalUrl = `https://leetcode.com/problemset/all/?search=${finalUrl}`;
    } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    try {
      await api.post('/problems', {
        title: problemTitle.trim(),
        difficulty: problemDifficulty,
        url: finalUrl,
        listId: id,
      });

      // Clear states and reload
      setProblemInput('');
      setProblemTitle('');
      setProblemDifficulty('Easy');
      setModalOpen(false);
      fetchListDetails();
    } catch (error) {
      setModalError(error.response?.data?.message || 'Failed to add problem');
    }
    setModalLoading(false);
  };

  const handleToggleSolved = async (problemId) => {
    try {
      const res = await api.put(`/problems/${problemId}/solve`);
      // Update problem state locally
      setProblems((prev) =>
        prev.map((prob) => (prob._id === problemId ? res.data : prob))
      );
    } catch (err) {
      console.error('Failed to toggle solve state:', err);
    }
  };

  // Filter problems logic
  const filteredProblems = problems.filter((prob) => {
    const matchesSearch = prob.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prob.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = diffFilter === 'All' || prob.difficulty === diffFilter;
    return matchesSearch && matchesDiff;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="bg-dark-card border border-dark-border p-8 rounded-2xl text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-200">Error Loading List</h3>
        <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{error || 'List not found or access is denied.'}</p>
        <Link to="/lists" className="mt-6 inline-flex items-center gap-2 text-indigo-400 font-bold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Lists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-dark-border/60">
        <div>
          <Link to="/lists" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO LISTS
          </Link>
          <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-3">
            {list.name}
            <span className="text-xs bg-[#1F273E] px-3 py-1 rounded-full text-indigo-400 font-mono font-bold select-all select-none">
              INVITE CODE: {list.inviteCode}
            </span>
          </h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-sm transition-colors active:scale-[0.98] shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" /> Add Problem
        </button>
      </div>

      {/* Split Main View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Problems List Area (Left) */}
        <div className="xl:col-span-9 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-dark-card border border-dark-border p-4 rounded-xl">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search problems by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0B0F19] border border-dark-border/80 focus:border-indigo-500 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm"
              />
            </div>

            {/* Difficulty Filters */}
            <div className="flex gap-1.5 bg-[#0B0F19] p-1 rounded-lg border border-dark-border/80">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDiffFilter(diff)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    diffFilter === diff
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Problems Grid / Listing */}
          <div className="space-y-4">
            {filteredProblems.length === 0 ? (
              <div className="bg-dark-card border border-dark-border rounded-xl p-16 text-center text-zinc-500">
                <Code2 className="w-12 h-12 text-indigo-500/10 mx-auto mb-4" />
                <h4 className="font-bold text-zinc-300">No problems found</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  {searchTerm || diffFilter !== 'All'
                    ? 'No items match your active search filters.'
                    : 'Click "Add Problem" to populate this shared list!'}
                </p>
              </div>
            ) : (
              filteredProblems.map((prob) => {
                const userSolved = prob.solvedBy.some((u) => u._id.toString() === user?._id.toString());
                
                // Difficulty styles
                let diffBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (prob.difficulty === 'Medium') {
                  diffBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                } else if (prob.difficulty === 'Hard') {
                  diffBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                }

                // Solved status tracking
                const solvedCount = prob.solvedBy.length;
                const totalMembersCount = list.members.length;
                const solvedPercentage = Math.round((solvedCount / totalMembersCount) * 100);

                // Find members who DID NOT solve this problem
                const solvedIdsSet = new Set(prob.solvedBy.map((u) => u._id.toString()));
                const pendingMembers = list.members.filter((m) => !solvedIdsSet.has(m._id.toString()));

                return (
                  <div
                    key={prob._id}
                    className={`bg-dark-card border rounded-xl p-5 hover:border-dark-border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5 group ${
                      userSolved ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-dark-border'
                    }`}
                  >
                    {/* Left: Problem info and solved checkbox */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Solved toggle checkbox */}
                      <button
                        onClick={() => handleToggleSolved(prob._id)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border mt-1 transition-all ${
                          userSolved
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'border-zinc-700 hover:border-zinc-400 text-transparent'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <a
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-zinc-100 hover:text-indigo-400 flex items-center gap-1 transition-colors text-base break-words"
                          >
                            {prob.title}
                            <ExternalLink className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${diffBadgeColor}`}>
                            {prob.difficulty}
                          </span>
                        </div>

                        {/* Who solved info (Dynamic) */}
                        <div className="mt-3.5 flex flex-wrap gap-4 text-xs font-medium text-zinc-500 items-center">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                            Added by {prob.addedBy?.username || 'Unknown'}
                          </span>
                          
                          {/* Solved users */}
                          {solvedCount > 0 && (
                            <div className="flex items-center gap-1 bg-[#162B28] px-2.5 py-1 rounded-full border border-emerald-500/10 text-emerald-400">
                              <span className="font-bold">{solvedCount}/{totalMembersCount} Solved:</span>
                              <div className="flex -space-x-1.5 overflow-hidden ml-1">
                                {prob.solvedBy.slice(0, 4).map((sUser) => (
                                  <div key={sUser._id} title={sUser.username}>
                                    <Avatar name={sUser.avatar} className="w-4 h-4 rounded-full ring-1 ring-dark-card" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Remaining users summary */}
                          {pendingMembers.length > 0 && (
                            <span className="text-[11px] text-zinc-500">
                              Remaining:{' '}
                              <span className="text-zinc-400 font-semibold">
                                {pendingMembers.map((m) => m.username).join(', ')}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Solved percentage progress indicator */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="w-24 bg-[#0B0F19] h-2 rounded-full border border-dark-border overflow-hidden hidden sm:block">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${solvedPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-400">{solvedPercentage}% Done</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar Members Panel (Right) */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-dark-card border border-dark-border p-5 rounded-xl">
            <h3 className="text-base font-extrabold mb-4 text-zinc-100 flex items-center gap-2 border-b border-dark-border/60 pb-3">
              <Users className="w-4 h-4 text-indigo-500" />
              List Members ({list.members.length})
            </h3>
            <div className="space-y-3.5">
              {list.members.map((member) => {
                // Calculate solved count in this list for this member
                const solvedCount = problems.filter((prob) =>
                  prob.solvedBy.some((su) => su._id.toString() === member._id.toString())
                ).length;

                return (
                  <div key={member._id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.avatar} className="w-7 h-7 rounded-full shrink-0" />
                      <span className="font-semibold truncate text-zinc-300">{member.username}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 font-mono shrink-0">
                      {solvedCount} Done
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Problem Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          {/* Panel */}
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 relative z-10 animate-scale-up">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold flex items-center gap-2 mb-4 text-zinc-100">
              <PlusCircle className="w-5 h-5 text-indigo-500" />
              Add LeetCode Problem
            </h3>

            {modalError && (
              <p className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg mb-4 leading-relaxed">
                {modalError}
              </p>
            )}

            <form onSubmit={handleAddProblem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  LeetCode URL or Problem Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 OR https://leetcode.com/problems/two-sum/"
                  value={problemInput}
                  onChange={(e) => setProblemInput(e.target.value)}
                  onBlur={handleProblemInputBlur}
                  className="w-full bg-[#0B0F19] border border-dark-border focus:border-indigo-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Problem Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Two Sum"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-dark-border focus:border-indigo-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2 bg-[#0B0F19] p-1.5 rounded-lg border border-dark-border">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setProblemDifficulty(diff)}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                        problemDifficulty === diff
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 mt-6"
              >
                {modalLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Add to List'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListDetails;
