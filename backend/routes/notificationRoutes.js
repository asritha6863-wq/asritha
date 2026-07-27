const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  clearAll,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/',                    getNotifications);
router.get('/unread-count',        getUnreadCount);
router.patch('/mark-all-read',     markAllRead);
router.delete('/clear-all',        clearAll);
router.patch('/:id/read',          markRead);

module.exports = router;
