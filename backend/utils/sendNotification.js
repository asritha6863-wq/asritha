/**
 * sendNotification.js
 *
 * Creates an in-app notification for a user.
 * Called from approvalController after every workflow state transition.
 *
 * Usage:
 *   await sendNotification({
 *     recipient: userId,
 *     type: 'quotation_pending',
 *     title: 'Quotation Upload Required',
 *     message: 'REQ-2024-0001 — Dept Head approved. Please upload vendor quotations.',
 *     requirement: requirementId,
 *     requirementNumber: 'REQ-2024-0001',
 *     actionUrl: '/review/REQUIREMENT_ID/quotations',
 *   });
 */
const Notification = require('../models/Notification');

const sendNotification = async ({ recipient, type, title, message, requirement, requirementNumber, actionUrl }) => {
  if (!recipient) return; // skip if no recipient found (e.g. role not assigned)
  try {
    await Notification.create({ recipient, type, title, message, requirement, requirementNumber, actionUrl });
  } catch (err) {
    // Notifications are non-critical — log but don't crash the workflow
    console.error('[Notification] Failed to create:', err.message);
  }
};

module.exports = sendNotification;
