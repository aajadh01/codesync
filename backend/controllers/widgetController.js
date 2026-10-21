const List = require('../models/List');
const Problem = require('../models/Problem');
const SolveEvent = require('../models/SolveEvent');
const User = require('../models/User');

// Curated backup problems if the user has no lists or problems yet
const FALLBACK_CHALLENGES = [
  {
    title: 'Two Sum',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/two-sum/',
    topic: 'Array',
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/valid-parentheses/',
    topic: 'Stack',
  },
  {
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/merge-two-sorted-lists/',
    topic: 'Linked List',
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    topic: 'Sliding Window',
  },
  {
    title: 'Container With Most Water',
    difficulty: 'Medium',
    url: 'https://leetcode.com/problems/container-with-most-water/',
    topic: 'Two Pointers',
  },
  {
    title: '3Sum',
    difficulty: 'Medium',
    url: 'https://leetcode.com/problems/3sum/',
    topic: 'Two Pointers',
  },
  {
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    url: 'https://leetcode.com/problems/trapping-rain-water/',
    topic: 'Dynamic Programming',
  },
  {
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
    topic: 'Binary Search',
  },
];

// Helper to get start and end of current local day in UTC
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @desc    Get user's shared lists for widget configuration
// @route   GET /api/widgets/lists
// @access  Private
const getUserLists = async (req, res) => {
  try {
    const userId = req.user._id;
    const lists = await List.find({ members: userId }).sort({ updatedAt: -1 });

    const listIds = lists.map((l) => l._id);
    const problems = await Problem.find({ list: { $in: listIds } });

    const listsData = lists.map((list) => {
      const listProblems = problems.filter((p) => p.list.toString() === list._id.toString());
      const totalProblems = listProblems.length;
      const solvedCount = listProblems.filter((p) =>
        p.solvedBy.some((uid) => uid.toString() === userId.toString())
      ).length;

      return {
        id: list._id.toString(),
        name: list.name,
        inviteCode: list.inviteCode,
        totalProblems,
        solvedCount,
      };
    });

    res.json({ lists: listsData });
  } catch (error) {
    console.error('Widget getUserLists error:', error);
    res.status(500).json({ message: 'Failed to load user lists' });
  }
};

// @desc    Get details and problems of a specific list for widgets (Quick Solve & Group Focus)
// @route   GET /api/widgets/list/:id
// @access  Private
const getListDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    if (!list.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied: not a member of this list' });
    }

    const problems = await Problem.find({ list: id }).sort({ createdAt: -1 });

    const formattedProblems = problems.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      difficulty: p.difficulty,
      url: p.url,
      topic: p.topic || 'General',
      isSolved: p.solvedBy.some((uid) => uid.toString() === userId.toString()),
    }));

    const solvedCount = formattedProblems.filter((p) => p.isSolved).length;
    const totalProblems = formattedProblems.length;
    const completionPercentage = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;

    res.json({
      id: list._id.toString(),
      name: list.name,
      inviteCode: list.inviteCode,
      totalProblems,
      solvedCount,
      completionPercentage,
      problems: formattedProblems,
    });
  } catch (error) {
    console.error('Widget getListDetails error:', error);
    res.status(500).json({ message: 'Failed to load list details' });
  }
};

// @desc    Toggle or explicitly set solved status for a problem (Idempotent for widgets)
// @route   POST /api/widgets/solve-toggle
// @access  Private
const toggleProblemSolve = async (req, res) => {
  try {
    const userId = req.user._id;
    const { problemId, solved } = req.body;

    if (!problemId) {
      return res.status(400).json({ message: 'problemId is required' });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const list = await List.findById(problem.list);
    if (!list || !list.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this list' });
    }

    const solvedIndex = problem.solvedBy.indexOf(userId);
    const currentlySolved = solvedIndex > -1;

    // Idempotent target state: if explicit boolean 'solved' is provided, honor it; otherwise toggle
    const shouldBeSolved = typeof solved === 'boolean' ? solved : !currentlySolved;

    if (shouldBeSolved && !currentlySolved) {
      problem.solvedBy.push(userId);
      await SolveEvent.findOneAndUpdate(
        { user: userId, problem: problem._id },
        {
          user: userId,
          problem: problem._id,
          list: problem.list,
          solvedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      await problem.save();
    } else if (!shouldBeSolved && currentlySolved) {
      problem.solvedBy.splice(solvedIndex, 1);
      await SolveEvent.deleteOne({ user: userId, problem: problem._id });
      await problem.save();
    }
    // If shouldBeSolved === currentlySolved, state is already reached (idempotent no-op!)

    // Calculate updated list statistics
    const listProblems = await Problem.find({ list: problem.list });
    const totalProblems = listProblems.length;
    const solvedCount = listProblems.filter((p) =>
      p.solvedBy.some((uid) => uid.toString() === userId.toString())
    ).length;
    const completionPercentage = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;

    // Calculate today's solved count
    const { start, end } = getTodayRange();
    const completedToday = await SolveEvent.countDocuments({
      user: userId,
      solvedAt: { $gte: start, $lte: end },
    });

    const user = await User.findById(userId);
    const dailyTarget = user?.dailyTarget || 3;

    return res.json({
      success: true,
      problemId: problem._id.toString(),
      isSolved: shouldBeSolved,
      listId: problem.list.toString(),
      totalProblems,
      solvedCount,
      completionPercentage,
      completedToday,
      dailyTarget,
    });
  } catch (error) {
    console.error('Widget toggleProblemSolve error:', error);
    res.status(500).json({ message: 'Failed to update solve state' });
  }
};

// @desc    Get Daily DSA Mission status and next challenge
// @route   GET /api/widgets/daily-mission
// @access  Private
const getDailyMission = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const dailyTarget = user?.dailyTarget || 3;

    const { start, end } = getTodayRange();
    const completedToday = await SolveEvent.countDocuments({
      user: userId,
      solvedAt: { $gte: start, $lte: end },
    });

    // Find next eligible unsolved problem across user's lists
    const userLists = await List.find({ members: userId });
    const listIds = userLists.map((l) => l._id);

    let nextProblem = null;
    if (listIds.length > 0) {
      const pending = await Problem.find({
        list: { $in: listIds },
        solvedBy: { $ne: userId },
      })
        .populate('list', 'name')
        .sort({ createdAt: -1 })
        .limit(1);

      if (pending.length > 0) {
        const p = pending[0];
        nextProblem = {
          id: p._id.toString(),
          title: p.title,
          difficulty: p.difficulty,
          url: p.url,
          topic: p.topic || 'General',
          listName: p.list?.name || 'Shared List',
          isSolved: false,
        };
      }
    }

    // If all problems in user's lists are solved, pick one fallback challenge
    if (!nextProblem) {
      const fallback = FALLBACK_CHALLENGES[0];
      nextProblem = {
        id: 'fallback-1',
        title: fallback.title,
        difficulty: fallback.difficulty,
        url: fallback.url,
        topic: fallback.topic,
        listName: 'Recommended',
        isSolved: false,
      };
    }

    const progressPercentage = Math.min(
      100,
      Math.round((completedToday / Math.max(1, dailyTarget)) * 100)
    );

    res.json({
      dailyTarget,
      completedToday,
      remaining: Math.max(0, dailyTarget - completedToday),
      progressPercentage,
      nextProblem,
    });
  } catch (error) {
    console.error('Widget getDailyMission error:', error);
    res.status(500).json({ message: 'Failed to load daily mission' });
  }
};

// @desc    Set Daily DSA target
// @route   POST /api/widgets/daily-target
// @access  Private
const setDailyTarget = async (req, res) => {
  try {
    const userId = req.user._id;
    const { target } = req.body;

    const parsedTarget = parseInt(target, 10);
    if (isNaN(parsedTarget) || parsedTarget < 1 || parsedTarget > 50) {
      return res.status(400).json({ message: 'Target must be a number between 1 and 50' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.dailyTarget = parsedTarget;
    await user.save();

    res.json({
      success: true,
      dailyTarget: user.dailyTarget,
    });
  } catch (error) {
    console.error('Widget setDailyTarget error:', error);
    res.status(500).json({ message: 'Failed to update daily target' });
  }
};

// @desc    Get a random challenge based on difficulty and topic filters
// @route   GET /api/widgets/random-challenge
// @access  Private
const getRandomChallenge = async (req, res) => {
  try {
    const userId = req.user._id;
    const { difficulty, topic } = req.query;

    const userLists = await List.find({ members: userId });
    const listIds = userLists.map((l) => l._id);

    const query = { list: { $in: listIds } };

    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    if (topic && topic !== 'All') {
      query.topic = { $regex: new RegExp(`^${topic.trim()}$`, 'i') };
    }

    // Try finding unsolved problems first
    let pool = await Problem.find({
      ...query,
      solvedBy: { $ne: userId },
    }).populate('list', 'name');

    // If no unsolved problems found, fallback to all problems matching filters in user lists
    if (pool.length === 0) {
      pool = await Problem.find(query).populate('list', 'name');
    }

    let selectedProblem = null;

    if (pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIndex];
      selectedProblem = {
        id: chosen._id.toString(),
        title: chosen.title,
        difficulty: chosen.difficulty,
        url: chosen.url,
        topic: chosen.topic || 'General',
        listName: chosen.list?.name || 'Shared List',
        isSolved: chosen.solvedBy.some((uid) => uid.toString() === userId.toString()),
      };
    } else {
      // Fallback from curated challenges
      let filteredFallbacks = FALLBACK_CHALLENGES;
      if (difficulty && difficulty !== 'All') {
        filteredFallbacks = filteredFallbacks.filter((f) => f.difficulty === difficulty);
      }
      if (filteredFallbacks.length === 0) {
        filteredFallbacks = FALLBACK_CHALLENGES;
      }
      const chosen = filteredFallbacks[Math.floor(Math.random() * filteredFallbacks.length)];
      selectedProblem = {
        id: `fallback-${chosen.title.replace(/\s+/g, '-').toLowerCase()}`,
        title: chosen.title,
        difficulty: chosen.difficulty,
        url: chosen.url,
        topic: chosen.topic,
        listName: 'CodeSync Recommended',
        isSolved: false,
      };
    }

    res.json({ problem: selectedProblem });
  } catch (error) {
    console.error('Widget getRandomChallenge error:', error);
    res.status(500).json({ message: 'Failed to fetch random challenge' });
  }
};

// @desc    Get compact leaderboard for a specific list widget
// @route   GET /api/widgets/leaderboard/:listId
// @access  Private
const getListLeaderboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { listId } = req.params;

    const list = await List.findById(listId).populate('members', 'username avatar');
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    if (!list.members.some((m) => m._id.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied: not a member of this list' });
    }

    const problems = await Problem.find({ list: listId });

    const rankings = list.members.map((member) => {
      const memberIdStr = member._id.toString();
      const solvedCount = problems.filter((p) =>
        p.solvedBy.some((uid) => uid.toString() === memberIdStr)
      ).length;

      return {
        userId: member._id.toString(),
        username: member.username,
        avatar: member.avatar,
        totalSolved: solvedCount,
      };
    });

    // Sort descending by total solved
    rankings.sort((a, b) => b.totalSolved - a.totalSolved);

    // Assign 1-based ranks
    const ranked = rankings.map((r, index) => ({
      rank: index + 1,
      ...r,
    }));

    res.json({
      listId: list._id.toString(),
      listName: list.name,
      totalMembers: list.members.length,
      leaderboard: ranked.slice(0, 5), // Top 5 for widget display
    });
  } catch (error) {
    console.error('Widget getListLeaderboard error:', error);
    res.status(500).json({ message: 'Failed to fetch list leaderboard' });
  }
};

module.exports = {
  getUserLists,
  getListDetails,
  toggleProblemSolve,
  getDailyMission,
  setDailyTarget,
  getRandomChallenge,
  getListLeaderboard,
};
