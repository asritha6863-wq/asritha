require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');

// Clears ALL data from User, Department, and Designation collections.
// Intended for local/dev use only.
const clear = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Clear] Connected to MongoDB.');

    if (process.env.NODE_ENV === 'production') {
      console.error('[Clear] Refusing to run in production. Aborting.');
      process.exit(1);
    }

    const results = await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Designation.deleteMany({}),
    ]);

    console.log(`[Clear] Removed ${results[0].deletedCount} users.`);
    console.log(`[Clear] Removed ${results[1].deletedCount} departments.`);
    console.log(`[Clear] Removed ${results[2].deletedCount} designations.`);
    console.log('[Clear] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[Clear] Failed:', err.message);
    process.exit(1);
  }
};

clear();
