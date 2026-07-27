const Notification = require('../models/Notification');
const asyncHandler  = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// Returns paginated notifications for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.read = false;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    unreadCount,
    notifications,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────────────────────────────────────
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
  });
  res.status(200).json({ success: true, count });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ─────────────────────────────────────────────────────────────────────────────
exports.markRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) return next(new ErrorResponse('Notification not found', 404));
  res.status(200).json({ success: true, notification });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/mark-all-read
// ─────────────────────────────────────────────────────────────────────────────
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/clear-all
// ─────────────────────────────────────────────────────────────────────────────
exports.clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id, read: true });
  res.status(200).json({ success: true, message: 'Read notifications cleared.' });
});
