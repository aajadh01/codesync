const List = require('../models/List');
const Problem = require('../models/Problem');

// Helper to generate a random 6-character uppercase alphanumeric code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @desc    Create a new shared list
// @route   POST /api/lists
// @access  Private
const createList = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'List name is required' });
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let codeExists = await List.findOne({ inviteCode });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await List.findOne({ inviteCode });
    }

    const list = await List.create({
      name: name.trim(),
      inviteCode,
      owner: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(list);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Join a list using invite code
// @route   POST /api/lists/join
// @access  Private
const joinList = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const formattedCode = inviteCode.trim().toUpperCase();

    // Find list
    const list = await List.findOne({ inviteCode: formattedCode });
    if (!list) {
      return res.status(404).json({ message: 'List not found. Please check the code.' });
    }

    // Check if user is already a member
    if (list.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this list' });
    }

    // Add user to members
    list.members.push(req.user._id);
    await list.save();

    res.status(200).json({
      message: 'Successfully joined list',
      list,
    });
  } catch (error) {
    console.error('Join list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all lists the user is a member of
// @route   GET /api/lists
// @access  Private
const getLists = async (req, res) => {
  try {
    const lists = await List.find({ members: req.user._id })
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });

    // Include additional aggregates per list (number of problems)
    const listIds = lists.map((l) => l._id);
    
    // Get problem counts for these lists
    const problemsCount = await Problem.aggregate([
      { $match: { list: { $in: listIds } } },
      { $group: { _id: '$list', count: { $sum: 1 } } },
    ]);

    const problemMap = {};
    problemsCount.forEach((pc) => {
      problemMap[pc._id.toString()] = pc.count;
    });

    const response = lists.map((list) => {
      const listObj = list.toObject();
      listObj.problemCount = problemMap[list._id.toString()] || 0;
      return listObj;
    });

    res.json(response);
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed view of a specific list (including problems)
// @route   GET /api/lists/:id
// @access  Private
const getListDetails = async (req, res) => {
  try {
    const listId = req.params.id;

    // Fetch list and check if member
    const list = await List.findById(listId)
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar');

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    const isMember = list.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this list' });
    }

    // Fetch problems in this list
    const problems = await Problem.find({ list: listId })
      .populate('addedBy', 'username avatar')
      .populate('solvedBy', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({
      list,
      problems,
    });
  } catch (error) {
    console.error('Get list details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createList,
  joinList,
  getLists,
  getListDetails,
};
