const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'requirement_submitted',    // RE submitted → SE
  'requirement_approved',     // any approval step forward
  'requirement_returned',     // returned to RE
  'requirement_rejected',     // rejected
  'quotation_pending',        // SE needs to upload quotations
  'quotation_submitted',      // SE submitted quotations → DM
  'quotation_approved',       // DM/DD approved quotations
  'po_pending',               // SE needs to upload PO
  'po_submitted',             // SE submitted PO → DM
  'po_review',                // DM approved PO → DD to sign
  'po_signed',                // DD signed PO → SE to email supplier
  'grn_pending',              // SE needs to create GRN after delivery
  'grn_submitted',            // SE submitted GRN → DM
  'grn_approved',             // GRN fully approved → SE to submit payment docs
  'payment_pending',          // SE needs to upload invoice
  'payment_verification',     // Accountant receives docs for 3-way match
  'process_completed',        // Accountant approved → procurement complete
];

const NotificationSchema = new mongoose.Schema({
  recipient:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:          { type: String, enum: NOTIFICATION_TYPES, required: true },
  title:         { type: String, required: true, maxlength: 200 },
  message:       { type: String, required: true, maxlength: 1000 },
  requirement:   { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement' },
  requirementNumber: { type: String },
  actionUrl:     { type: String }, // frontend route to navigate to on click
  read:          { type: Boolean, default: false },
  readAt:        { type: Date },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
