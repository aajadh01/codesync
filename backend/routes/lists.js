const express = require('express');
const router = express.Router();
const {
  createList,
  joinList,
  getLists,
  getListDetails,
} = require('../controllers/listController');
const { protect } = require('../middleware/auth');

router.use(protect); // All list routes require authentication

router.post('/', createList);
router.post('/join', joinList);
router.get('/', getLists);
router.get('/:id', getListDetails);

module.exports = router;
