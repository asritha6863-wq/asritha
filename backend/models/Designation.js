const mongoose = require('mongoose');

const DesignationSchema = new mongoose.Schema(
  {
    designationName: {
      type: String,
      required: [true, 'Designation name is required'],
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    level: {
      type: Number,
      required: [true, 'Level is required'],
      min: 1,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

DesignationSchema.index({ designationName: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Designation', DesignationSchema);
