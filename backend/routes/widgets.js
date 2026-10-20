const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getUserLists,
  getListDetails,
  toggleProblemSolve,
  getDailyMission,
  setDailyTarget,
  getRandomChallenge,
  getListLeaderboard,
} = require('../controllers/widgetController');

// All widget routes require valid JWT authentication
router.use(authMiddleware);

router.get('/lists', getUserLists);
router.get('/list/:id', getListDetails);
router.post('/solve-toggle', toggleProblemSolve);
router.get('/daily-mission', getDailyMission);
router.post('/daily-target', setDailyTarget);
router.get('/random-challenge', getRandomChallenge);
router.get('/leaderboard/:listId', getListLeaderboard);

module.exports = router;
