const User = require('../models/User');
const List = require('../models/List');
const Problem = require('../models/Problem');

// @desc    Get dashboard statistics for current user
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all lists user is a member of
    const lists = await List.find({ members: userId });
    const listIds = lists.map((list) => list._id);

    // Fetch all problems in these lists
    const totalProblemsInLists = await Problem.find({ list: { $in: listIds } });

    // Calculate solved and pending counts
    let totalSolved = 0;
    let pendingProblems = [];

    totalProblemsInLists.forEach((prob) => {
      const isSolved = prob.solvedBy.includes(userId);
      if (isSolved) {
        totalSolved++;
      } else {
        pendingProblems.push({
          _id: prob._id,
          title: prob.title,
          difficulty: prob.difficulty,
          url: prob.url,
          listName: lists.find((l) => l._id.toString() === prob.list.toString())?.name || 'Shared List',
        });
      }
    });

    const totalProblemsCount = totalProblemsInLists.length;
    const progressPercentage = totalProblemsCount > 0 ? Math.round((totalSolved / totalProblemsCount) * 100) : 0;

    // Get recent activity: last 7 problems added in user's lists
    const recentAdded = await Problem.find({ list: { $in: listIds } })
      .populate('addedBy', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentActivity = recentAdded.map((prob) => ({
      _id: prob._id,
      type: 'add',
      user: prob.addedBy,
      problemTitle: prob.title,
      difficulty: prob.difficulty,
      listName: lists.find((l) => l._id.toString() === prob.list.toString())?.name || 'Shared List',
      time: prob.createdAt,
    }));

    res.json({
      totalSolved,
      totalPending: pendingProblems.length,
      progressPercentage,
      pendingProblems: pendingProblems.slice(0, 5), // Return first 5 pending problems
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get leaderboard rankings overall or for a specific list
// @route   GET /api/users/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const { listId } = req.query;
    let targetUsers = [];
    let scopeProblems = [];

    if (listId) {
      // List specific leaderboard
      const list = await List.findById(listId).populate('members', 'username email avatar');
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Check if user is member
      if (!list.members.some((m) => m._id.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied: You are not a member of this list' });
      }

      targetUsers = list.members;
      scopeProblems = await Problem.find({ list: listId });
    } else {
      // Platform-wide leaderboard (users in same lists as the current user, or all users for simplicity)
      // Since it's a collaborative tracker, let's pull all users
      targetUsers = await User.find({}).select('username email avatar createdAt');
      scopeProblems = await Problem.find({});
    }

    // Calculate solves per user
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const leaderboard = targetUsers.map((user) => {
      const userIdStr = user._id.toString();

      // Overall solved count in the scope
      const solvedProblems = scopeProblems.filter((p) =>
        p.solvedBy.some((uid) => uid.toString() === userIdStr)
      );

      // Weekly solved count (solved within the last week)
      // Note: We use updatedAt as the proxy for solved date since toggling updates the problem
      const weeklySolved = solvedProblems.filter((p) => p.updatedAt >= oneWeekAgo).length;

      return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        totalSolved: solvedProblems.length,
        weeklySolved: weeklySolved,
        joinedAt: user.createdAt,
      };
    });

    // Sort by totalSolved descending, then weeklySolved descending
    leaderboard.sort((a, b) => {
      if (b.totalSolved !== a.totalSolved) {
        return b.totalSolved - a.totalSolved;
      }
      return b.weeklySolved - a.weeklySolved;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getLeaderboard,
};
