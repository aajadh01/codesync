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

// @desc    Fetch LeetCode problem details by number/ID
// @route   GET /api/problems/leetcode/:number
// @access  Private
const getLeetCodeProblemDetails = async (req, res) => {
  try {
    const numberStr = req.params.number;
    if (!/^\d+$/.test(numberStr)) {
      return res.status(400).json({ message: 'Problem number must be a positive integer' });
    }
    
    const problemNumber = parseInt(numberStr, 10);
    
    // Download the LeetCode questions dataset from a raw, reliable GitHub source
    const datasetUrl = 'https://raw.githubusercontent.com/noworneverev/leetcode-api/main/data/leetcode_questions.json';
    
    console.log(`Fetching LeetCode problem data by number: ${problemNumber}...`);
    
    const response = await fetch(datasetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch LeetCode dataset: ${response.statusText}`);
    }
    
    const problemsList = await response.json();
    
    // Search for the question inside the list
    // Robust key checks supporting various community JSON structures
    const matched = problemsList.find(item => {
      const id = item.question_id || item.questionId || item.frontend_id || item.id;
      return id && parseInt(id, 10) === problemNumber;
    });
    
    if (matched) {
      // Keys matching the noworneverev/leetcode-api schema
      const title = matched.title || matched.question_title || matched.questionTitle;
      const slug = matched.title_slug || matched.question_title_slug || matched.questionTitleSlug || matched.slug;
      const difficulty = matched.difficulty || 'Medium';
      
      const url = `https://leetcode.com/problems/${slug}/`;
      
      return res.json({
        title,
        difficulty,
        url
      });
    } else {
      return res.status(404).json({ message: `LeetCode problem #${problemNumber} not found in database.` });
    }
  } catch (error) {
    console.error('Error fetching LeetCode problem:', error.message);
    res.status(500).json({ message: 'Could not fetch LeetCode problem automatically.' });
  }
};

module.exports = {
  addProblem,
  toggleSolved,
  getLeetCodeProblemDetails,
};
