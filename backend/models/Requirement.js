const mongoose = require('mongoose');

// ── Status list — full end-to-end workflow ────────────────────────────────────
const STATUSES = [
  'Draft',
  'Submitted',           // RE → SE
  'Under Review',        // SE → DM
  'Budget Check',        // DM (>500 AED) → BC
  'MD Review',           // BC (>3000 AED) → MD
  'Director Review',     // BC (≤3000) or MD → Dept Head (quotation approval)
  'Quotation Pending',   // Dept Head → SE (upload quotations)
  'Quotation Review',    // SE → DM (review quotations)
  'Director Review2',    // DM → Dept Head (approve quotations)
  'PO Pending',          // Dept Head approves quotations → SE (upload PO doc)
  'PO Review',           // SE uploads PO → DM reviews PO
  'PO Sign',             // DM approves PO → Dept Head (digitally sign PO)
  'PO Signed',           // Dept Head signs → SE (email to supplier)
  'GRN Pending',         // SE receives goods → create GRN → DM
  'GRN Review',          // DM → Dept Head (review GRN)
  'GRN Review2',         // Dept Head final GRN approval
  'Payment Pending',     // Dept Head → SE → submit PO+GRN+Invoice to Accountant
  'Payment Verification',// Accountant performs 3-way matching
  'Completed',           // Accountant approves — fully done
  'Rejected',
  'Returned',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORIES = ['IT Equipment', 'Office Supplies', 'Furniture', 'Machinery', 'Software', 'Services', 'Raw Materials', 'Other'];

// ── Sub-schemas ───────────────────────────────────────────────────────────────
const AttachmentSchema = new mongoose.Schema({
  fileName:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType:     { type: String, required: true },
  size:         { type: Number, required: true },
  path:         { type: String, required: true },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, _id: true });

const TimelineEntrySchema = new mongoose.Schema({
  action:      { type: String, required: true },
  actor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName:   { type: String },
  role:        { type: String },
  note:        { type: String, default: '' },
  fromStatus:  { type: String },
  toStatus:    { type: String },
}, { timestamps: true, _id: true });

const CommentSchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName:  { type: String, required: true },
  role:        { type: String },
  text:        { type: String, required: true, maxlength: 2000 },
}, { timestamps: true, _id: true });

// ── Main schema ───────────────────────────────────────────────────────────────
const RequirementSchema = new mongoose.Schema({
  requirementNumber: { type: String, unique: true },

  // Employee info
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId:      { type: String, required: true },
  employeeName:    { type: String, required: true },
  department:      { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  departmentName:  { type: String, required: true },
  designation:     { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  designationName: { type: String, default: '' },

  // Item details
  category:            { type: String, enum: CATEGORIES, required: true },
  itemName:            { type: String, required: true, trim: true, maxlength: 200 },
  brand:               { type: String, trim: true, default: '' },
  model:               { type: String, trim: true, default: '' },
  specification:       { type: String, trim: true, default: '', maxlength: 2000 },
  quantity:            { type: Number, required: true, min: 1 },
  unit:                { type: String, required: true, trim: true },
  estimatedUnitPrice:  { type: Number, required: true, min: 0 },
  estimatedTotalPrice: { type: Number, min: 0 },

  priority:         { type: String, enum: PRIORITIES, required: true, default: 'Medium' },
  purpose:          { type: String, required: true, trim: true, maxlength: 2000 },
  requiredDate:     { type: Date, required: true },
  deliveryLocation: { type: String, required: true, trim: true, maxlength: 300 },

  // Attachments (request-level documents)
  attachments: [AttachmentSchema],

  // Quotations — uploaded by SE after Director/Dept Head approval
  quotations: [AttachmentSchema],

  // Quotation Comparison — SE fills in Q1/Q2/Q3 structured data for comparison
  quotationComparison: {
    preparedBy:   { type: String },
    preparedDate: { type: Date },
    q1: {
      vendorName:    { type: String, trim: true },
      vendorContact: { type: String, trim: true },
      unitPrice:     { type: Number, min: 0 },
      totalPrice:    { type: Number, min: 0 },
      deliveryDays:  { type: Number, min: 0 },
      paymentTerms:  { type: String, trim: true },
      warranty:      { type: String, trim: true },
      remarks:       { type: String, trim: true },
      quotationFile: AttachmentSchema,
    },
    q2: {
      vendorName:    { type: String, trim: true },
      vendorContact: { type: String, trim: true },
      unitPrice:     { type: Number, min: 0 },
      totalPrice:    { type: Number, min: 0 },
      deliveryDays:  { type: Number, min: 0 },
      paymentTerms:  { type: String, trim: true },
      warranty:      { type: String, trim: true },
      remarks:       { type: String, trim: true },
      quotationFile: AttachmentSchema,
    },
    q3: {
      vendorName:    { type: String, trim: true },
      vendorContact: { type: String, trim: true },
      unitPrice:     { type: Number, min: 0 },
      totalPrice:    { type: Number, min: 0 },
      deliveryDays:  { type: Number, min: 0 },
      paymentTerms:  { type: String, trim: true },
      warranty:      { type: String, trim: true },
      remarks:       { type: String, trim: true },
      quotationFile: AttachmentSchema,
    },
    recommendedVendor: { type: String, enum: ['Q1', 'Q2', 'Q3', ''], default: '' },
    recommendationReason: { type: String, trim: true, maxlength: 1000 },
  },

  // Purchase Order — prepared by SE and signed by Dept Head (uploaded back)
  purchaseOrder: {
    document:       AttachmentSchema,          // SE uploads original PO document
    signedDocument: AttachmentSchema,          // Dept Head uploads signed PO
    signedAt:       { type: Date },
    signedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedByName:   { type: String },
    supplierEmail:  { type: String, trim: true },
    sentAt:         { type: Date },
  },

  // Structured PO details — entered by SE to generate formatted PO
  poDetails: {
    poNumber:          { type: String, trim: true },
    poDate:            { type: Date },
    toName:            { type: String, trim: true },       // vendor/supplier name
    toAddress:         { type: String, trim: true },
    toContact:         { type: String, trim: true },
    toEmail:           { type: String, trim: true },
    fromName:          { type: String, trim: true },       // company/department name
    fromAddress:       { type: String, trim: true },
    subjectRef:        { type: String, trim: true },       // subject line / reference
    items: [{
      description:   { type: String, trim: true },
      quantity:      { type: Number, min: 0 },
      unit:          { type: String, trim: true },
      unitPrice:     { type: Number, min: 0 },
      totalPrice:    { type: Number, min: 0 },
    }],
    subtotal:          { type: Number, min: 0 },
    vat:               { type: Number, min: 0, default: 0 },
    vatPercent:        { type: Number, min: 0, default: 0 },
    grandTotal:        { type: Number, min: 0 },
    currency:          { type: String, default: 'AED' },
    paymentTerms:      { type: String, trim: true },
    deliveryTerms:     { type: String, trim: true },
    deliveryLocation:  { type: String, trim: true },
    warrantyTerms:     { type: String, trim: true },
    specialConditions: { type: String, trim: true },
    authorizedBy:      { type: String, trim: true },
    authorizedTitle:   { type: String, trim: true },
  },

  // Goods Receipt Note — created by SE after delivery
  grn: {
    document:         AttachmentSchema,
    receivedAt:       { type: Date },       // actual delivery date
    deliveryNote:     { type: String, trim: true, maxlength: 2000 },
    quantityReceived: { type: Number, min: 0 },
    condition:        { type: String, trim: true, maxlength: 500 },
  },

  // Invoice — uploaded by SE for 3-way matching
  supplierInvoice: AttachmentSchema,
  invoiceNumber:   { type: String, trim: true },
  invoiceDate:     { type: Date },
  invoiceAmount:   { type: Number, min: 0 },

  // Three-way matching result (Accountant)
  threeWayMatch: {
    poMatched:      { type: Boolean },
    grnMatched:     { type: Boolean },
    invoiceMatched: { type: Boolean },
    notes:          { type: String, trim: true, maxlength: 2000 },
    verifiedAt:     { type: Date },
    verifiedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedByName: { type: String },
  },

  // Workflow control
  status:              { type: String, enum: STATUSES, default: 'Draft' },
  currentApprover:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentApproverRole: { type: String, default: '' },

  timeline:    [TimelineEntrySchema],
  comments:    [CommentSchema],

  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

RequirementSchema.index({ employee: 1, status: 1 });
RequirementSchema.index({ createdAt: -1 });
RequirementSchema.index({ status: 1, department: 1 });

RequirementSchema.pre('save', async function (next) {
  if (!this.requirementNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Requirement').countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.requirementNumber = `REQ-${year}-${seq}`;
  }
  if (this.quantity && this.estimatedUnitPrice) {
    this.estimatedTotalPrice = +(this.quantity * this.estimatedUnitPrice).toFixed(2);
  }
  next();
});

module.exports = mongoose.model('Requirement', RequirementSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.CATEGORIES = CATEGORIES;
