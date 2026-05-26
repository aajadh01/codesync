const express = require('express');
const router = express.Router();
const { getDashboardStats, getLeaderboard } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect); // All user endpoints require authentication

router.get('/dashboard', getDashboardStats);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
