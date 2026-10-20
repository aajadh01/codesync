const express = require('express');
const router = express.Router();
const { addProblem, toggleSolved, getLeetCodeProblemDetails } = require('../controllers/problemController');
const { protect } = require('../middleware/auth');

// Public lookup for LeetCode metadata (titles, difficulties, topics)
router.get('/leetcode/:number', getLeetCodeProblemDetails);
router.get('/leetcode', getLeetCodeProblemDetails);

// Protected routes (require valid JWT)
router.use(protect);
router.post('/', addProblem);
router.put('/:id/solve', toggleSolved);

module.exports = router;
