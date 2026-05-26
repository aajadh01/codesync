const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/avatar', protect, updateAvatar);

module.exports = router;
