const Problem = require('../models/Problem');
const List = require('../models/List');

// @desc    Add a problem to a shared list
// @route   POST /api/problems
// @access  Private
const addProblem = async (req, res) => {
  try {
    const { title, difficulty, url, listId } = req.body;

    if (!title || !difficulty || !url || !listId) {
      return res.status(400).json({ message: 'All fields (title, difficulty, url, listId) are required' });
    }

    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Difficulty must be Easy, Medium, or Hard' });
    }

    // Verify list exists and user is a member
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ message: 'Target list not found' });
    }

    const isMember = list.members.includes(req.user._id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this list' });
    }

    // Create problem
    const problem = await Problem.create({
      title: title.trim(),
      difficulty,
      url: url.trim(),
      list: listId,
      addedBy: req.user._id,
      solvedBy: [], // Empty initially
    });

    // Populate addedBy info to return to client
    const populatedProblem = await Problem.findById(problem._id)
      .populate('addedBy', 'username avatar')
      .populate('solvedBy', 'username avatar');

    res.status(201).json(populatedProblem);
  } catch (error) {
    console.error('Add problem error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle solved status for a problem
// @route   PUT /api/problems/:id/solve
// @access  Private
const toggleSolved = async (req, res) => {
  try {
    const problemId = req.params.id;
    const problem = await Problem.findById(problemId);

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Verify list membership
    const list = await List.findById(problem.list);
    if (!list || !list.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this list' });
    }

    const solvedIndex = problem.solvedBy.indexOf(req.user._id);
    
    if (solvedIndex > -1) {
      // User already solved, so unmark (remove user)
      problem.solvedBy.splice(solvedIndex, 1);
    } else {
      // User did not solve, so mark (add user)
      problem.solvedBy.push(req.user._id);
    }

    await problem.save();

    const updatedProblem = await Problem.findById(problem._id)
      .populate('addedBy', 'username avatar')
      .populate('solvedBy', 'username avatar');

    res.json(updatedProblem);
  } catch (error) {
    console.error('Toggle solved error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addProblem,
  toggleSolved,
};
