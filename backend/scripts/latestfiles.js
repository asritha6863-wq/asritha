require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Department');
require('../models/Designation');
const Req = require('../models/Requirement');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const reqs = await Req.find({}).sort({ createdAt: -1 }).limit(10).select('requirementNumber attachments');
  reqs.forEach(r => {
    if (r.attachments && r.attachments.length > 0) {
      r.attachments.forEach(a => {
        console.log(r.requirementNumber, '|', a.originalName, '|', a.path);
      });
    }
  });
  process.exit(0);
});
