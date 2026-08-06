require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Department');
require('../models/Designation');
const Req = require('../models/Requirement');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const all = await Req.find({}).select('requirementNumber attachments quotationComparison purchaseOrder grn supplierInvoice').limit(10);
  all.forEach(r => {
    if (r.attachments && r.attachments.length > 0) {
      r.attachments.forEach(a => console.log('ATT', r.requirementNumber, a.path));
    }
    if (r.quotationComparison) {
      ['q1','q2','q3'].forEach(k => {
        const f = r.quotationComparison[k]?.quotationFile;
        if (f) console.log('QUOT', r.requirementNumber, k, f.path);
      });
    }
    if (r.purchaseOrder?.document) console.log('PO', r.requirementNumber, r.purchaseOrder.document.path);
    if (r.grn?.document) console.log('GRN', r.requirementNumber, r.grn.document.path);
    if (r.supplierInvoice) console.log('INV', r.requirementNumber, r.supplierInvoice.path);
  });
  process.exit(0);
});
