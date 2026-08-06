/**
 * Makes all existing Cloudinary files publicly accessible
 * by updating their access_mode to 'public'
 */
require('dotenv').config();
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
require('../models/Department');
require('../models/Designation');
const Req = require('../models/Requirement');

const extractPublicId = (url) => {
  // Extract public_id from Cloudinary URL
  // e.g. https://res.cloudinary.com/fiyjffpb/image/upload/v.../erp/requirements/filename.pdf
  // → erp/requirements/filename.pdf  (without extension for image type)
  const match = url.match(/\/(?:image|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
};

const getResourceType = (url) => url.includes('/raw/upload/') ? 'raw' : 'image';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('[makePublic] Connected to MongoDB');

  const reqs = await Req.find({}).select('attachments quotationComparison purchaseOrder grn supplierInvoice');
  const allPaths = [];

  reqs.forEach(r => {
    r.attachments?.forEach(a => { if (a.path?.startsWith('http')) allPaths.push(a.path); });
    ['q1','q2','q3'].forEach(k => {
      const f = r.quotationComparison?.[k]?.quotationFile;
      if (f?.path?.startsWith('http')) allPaths.push(f.path);
    });
    if (r.purchaseOrder?.document?.path?.startsWith('http')) allPaths.push(r.purchaseOrder.document.path);
    if (r.purchaseOrder?.signedDocument?.path?.startsWith('http')) allPaths.push(r.purchaseOrder.signedDocument.path);
    if (r.grn?.document?.path?.startsWith('http')) allPaths.push(r.grn.document.path);
    if (r.supplierInvoice?.path?.startsWith('http')) allPaths.push(r.supplierInvoice.path);
  });

  console.log(`[makePublic] Found ${allPaths.length} Cloudinary files to make public`);

  let ok = 0, fail = 0;
  for (const url of allPaths) {
    const publicId = extractPublicId(url);
    const resourceType = getResourceType(url);
    if (!publicId) { console.log('  SKIP (no public_id):', url); fail++; continue; }
    try {
      await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        resource_type: resourceType,
        access_mode: 'public',
      });
      console.log(`  ✓ ${publicId}`);
      ok++;
    } catch (e) {
      console.log(`  ✗ ${publicId}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n[makePublic] Done: ${ok} success, ${fail} failed`);
  process.exit(0);
});
