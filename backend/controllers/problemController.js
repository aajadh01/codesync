const Problem = require('../models/Problem');
const List = require('../models/List');

// Helper to normalize LeetCode URLs for duplicate checking
const normalizeUrl = (urlStr) => {
  if (!urlStr) return '';
  let clean = urlStr.trim().toLowerCase();
  
  // Remove protocol
  clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '');
  
  // Remove trailing suffixes like /description, /submissions, /solutions, /discuss
  clean = clean.replace(/\/(description|submissions|solutions|discuss)$/, '');
  
  // Remove trailing slashes again just in case
  clean = clean.replace(/\/+$/, '');
  
  return clean;
};

// @desc    Add a problem to a shared list
// @route   POST /api/problems
// @access  Private
const addProblem = async (req, res) => {
  try {
    const { title, difficulty, url, listId, topic } = req.body;

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

    // Check if the problem already exists in this list (by normalized URL or title)
    const normalizedNew = normalizeUrl(url);
    const titleNew = title.trim().toLowerCase();

    const existingProblems = await Problem.find({ list: listId });
    const isDuplicate = existingProblems.some((prob) => {
      const normExisting = normalizeUrl(prob.url);
      const titleExisting = prob.title.trim().toLowerCase();
      return normExisting === normalizedNew || titleExisting === titleNew;
    });

    if (isDuplicate) {
      return res.status(400).json({ message: 'This problem is already present in this list.' });
    }

    // Format the topic (e.g. "sliding window" -> "Sliding Window", preserves acronyms like "DP")
    let formattedTopic = 'General';
    if (topic && topic.trim()) {
      formattedTopic = topic
        .trim()
        .split(/\s+/)
        .map((word) => {
          const lower = word.toLowerCase();
          if (lower === 'dp') return 'DP';
          if (lower === 'dfs') return 'DFS';
          if (lower === 'bfs') return 'BFS';
          if (word.length <= 3 && word.toUpperCase() === word) {
            return word;
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }

    // Create problem
    const problem = await Problem.create({
      title: title.trim(),
      difficulty,
      url: url.trim(),
      list: listId,
      addedBy: req.user._id,
      solvedBy: [], // Empty initially
      topic: formattedTopic,
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
    const identifier = req.params.number.trim();
    if (!identifier) {
      return res.status(400).json({ message: 'Problem identifier (number or slug) is required' });
    }

    const isNumber = /^\d+$/.test(identifier);
    const problemNumber = isNumber ? parseInt(identifier, 10) : null;
    const targetSlug = isNumber ? null : identifier.toLowerCase();
    
    // Download the LeetCode questions dataset from a raw, reliable GitHub source
    const datasetUrl = 'https://raw.githubusercontent.com/noworneverev/leetcode-api/main/data/leetcode_questions.json';
    
    console.log(`Fetching LeetCode problem data by identifier: ${identifier}...`);
    
    const response = await fetch(datasetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch LeetCode dataset: ${response.statusText}`);
    }
    
    const problemsList = await response.json();
    
    // Search for the question inside the list supporting flat and nested structures
    const matched = problemsList.find(item => {
      const q = item.data?.question || item.question || item;
      if (isNumber) {
        const id = q.questionFrontendId || q.question_id || q.questionId || q.frontend_id || q.id;
        return id && parseInt(id, 10) === problemNumber;
      } else {
        const slug = q.titleSlug || q.questionTitleSlug || q.title_slug || q.question_title_slug || q.slug || '';
        return slug.toLowerCase() === targetSlug;
      }
    });
    
    if (matched) {
      const q = matched.data?.question || matched.question || matched;
      
      const title = q.title || q.question_title || q.questionTitle;
      const slug = q.titleSlug || q.questionTitleSlug || q.title_slug || q.question_title_slug || q.slug;
      const difficulty = q.difficulty || 'Medium';
      
      const url = q.url || `https://leetcode.com/problems/${slug}/`;
      
      return res.json({
        title,
        difficulty,
        url
      });
    } else {
      return res.status(404).json({ message: `LeetCode problem "${identifier}" not found in database.` });
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
