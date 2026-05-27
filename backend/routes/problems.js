const express = require('express');
const router = express.Router();
const { addProblem, toggleSolved, getLeetCodeProblemDetails } = require('../controllers/problemController');
const { protect } = require('../middleware/auth');

router.use(protect); // All problem routes require authentication

router.post('/', addProblem);
router.get('/leetcode/:number', getLeetCodeProblemDetails);
router.put('/:id/solve', toggleSolved);

module.exports = router;
