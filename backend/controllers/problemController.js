const Problem = require('../models/Problem');
const List = require('../models/List');
const SolveEvent = require('../models/SolveEvent');

// In-memory indexed cache for LeetCode dataset to achieve instant (<1ms) lookups
let leetcodeCache = null; // { byNumber: Map, bySlug: Map }
let leetcodeFetchPromise = null;

const ensureLeetCodeDataset = async () => {
  if (leetcodeCache) return leetcodeCache;
  if (leetcodeFetchPromise) return leetcodeFetchPromise;

  leetcodeFetchPromise = (async () => {
    try {
      console.log('Loading LeetCode questions dataset into memory cache...');
      const datasetUrl = 'https://raw.githubusercontent.com/noworneverev/leetcode-api/main/data/leetcode_questions.json';
      const response = await fetch(datasetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch LeetCode dataset: ${response.statusText}`);
      }
      const problemsList = await response.json();
      const byNumber = new Map();
      const bySlug = new Map();

      for (const item of problemsList) {
        const q = item.data?.question || item.question || item;
        const id = q.questionFrontendId || q.question_id || q.questionId || q.frontend_id || q.id;
        const title = q.title || q.question_title || q.questionTitle;
        const difficulty = q.difficulty || 'Medium';
        let url = q.url || '';
        let slug = q.titleSlug || q.questionTitleSlug || q.title_slug || q.slug || '';

        if (!slug && url) {
          const match = url.match(/problems\/([^/?#]+)/i);
          if (match) slug = match[1];
        }
        if (!slug && title) {
          slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (!url && slug) {
          url = `https://leetcode.com/problems/${slug}/`;
        }

        let topic = 'General';
        if (Array.isArray(q.topicTags) && q.topicTags.length > 0 && q.topicTags[0].name) {
          topic = q.topicTags[0].name;
        }

        const problemData = {
          id: id ? id.toString() : '',
          title: title ? title.trim() : `Problem #${id}`,
          difficulty,
          url,
          slug: slug ? slug.toLowerCase() : '',
          topic,
        };

        if (id) {
          byNumber.set(id.toString(), problemData);
        }
        if (slug) {
          bySlug.set(slug.toLowerCase(), problemData);
        }
      }

      console.log(`Indexed ${byNumber.size} LeetCode problems successfully in memory!`);
      leetcodeCache = { byNumber, bySlug };
      return leetcodeCache;
    } catch (err) {
      console.error('Failed to load LeetCode dataset:', err.message);
      leetcodeFetchPromise = null;
      throw err;
    }
  })();

  return leetcodeFetchPromise;
};

// Auto-resolve LeetCode problem from number, slug, or full URL
const resolveLeetCodeProblem = async (identifier) => {
  if (!identifier) return null;
  const clean = identifier.toString().trim();
  const dataset = await ensureLeetCodeDataset();

  // 1. Direct number match (e.g. "1", "42", "238")
  if (/^\d+$/.test(clean)) {
    return dataset.byNumber.get(clean) || null;
  }

  // 2. Extract slug if full or partial URL
  let targetSlug = clean.toLowerCase();
  const urlMatch = clean.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  if (urlMatch) {
    targetSlug = urlMatch[1].toLowerCase();
  } else {
    // If input is something like "problems/two-sum" or "two-sum/"
    targetSlug = targetSlug.replace(/^problems\//, '').replace(/\/.*$/, '');
  }

  // 3. Match by slug
  if (dataset.bySlug.has(targetSlug)) {
    return dataset.bySlug.get(targetSlug);
  }

  // 4. Try kebab-case normalized slug
  const normalized = targetSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (dataset.bySlug.has(normalized)) {
    return dataset.bySlug.get(normalized);
  }

  return null;
};

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
    let { title, difficulty, url, listId, topic } = req.body;

    if (!listId) {
      return res.status(400).json({ message: 'Target listId is required' });
    }

    // Auto-resolve problem if only a number, slug, or partial URL was provided
    const lookupKey = url || title;
    if (lookupKey && (!title || !difficulty || !url || /^\d+$/.test(lookupKey.trim()) || !url.includes('leetcode.com'))) {
      try {
        const resolved = await resolveLeetCodeProblem(lookupKey);
        if (resolved) {
          title = title || resolved.title;
          difficulty = difficulty || resolved.difficulty;
          url = resolved.url;
          topic = topic || resolved.topic;
        }
      } catch (err) {
        console.warn('Auto-resolve during addProblem warning:', err.message);
      }
    }

    // If still missing full LeetCode URL but we have a number
    if (url && /^\d+$/.test(url.trim())) {
      url = `https://leetcode.com/problemset/all/?search=${url.trim()}`;
    }

    if (!title || !difficulty || !url) {
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
    let isNowSolved = false;
    
    if (solvedIndex > -1) {
      // User already solved, so unmark (remove user)
      problem.solvedBy.splice(solvedIndex, 1);
      await SolveEvent.deleteOne({ user: req.user._id, problem: problem._id });
    } else {
      // User did not solve, so mark (add user)
      problem.solvedBy.push(req.user._id);
      isNowSolved = true;
      await SolveEvent.findOneAndUpdate(
        { user: req.user._id, problem: problem._id },
        {
          user: req.user._id,
          problem: problem._id,
          list: problem.list,
          solvedAt: new Date(),
        },
        { upsert: true, new: true }
      );
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

// @desc    Fetch LeetCode problem details by number/ID/slug
// @route   GET /api/problems/leetcode/:number
// @access  Private
const getLeetCodeProblemDetails = async (req, res) => {
  try {
    const identifier = (req.params.number || req.query.query || req.query.q || req.query.id || '').trim();
    if (!identifier) {
      return res.status(400).json({ message: 'Problem identifier (number or slug) is required' });
    }

    const problem = await resolveLeetCodeProblem(identifier);
    if (problem) {
      return res.json({
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        url: problem.url,
        topic: problem.topic,
      });
    }

    return res.status(404).json({ message: `LeetCode problem "${identifier}" not found in database.` });
  } catch (error) {
    console.error('Error fetching LeetCode problem:', error.message);
    res.status(500).json({ message: 'Could not fetch LeetCode problem automatically.' });
  }
};

// Pre-warm the LeetCode questions cache in background on server start
ensureLeetCodeDataset().catch((e) => {
  console.warn('Initial background pre-warm of LeetCode dataset error (will retry on demand):', e.message);
});

module.exports = {
  addProblem,
  toggleSolved,
  getLeetCodeProblemDetails,
};
