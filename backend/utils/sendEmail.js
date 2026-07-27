const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');

// Sends an email via the configured SMTP transport.
// If SMTP credentials aren't set (e.g. local dev), logs to console instead of failing.
const sendEmail = async ({ to, subject, html, text }) => {
  if (!smtp.host || !smtp.user || !smtp.pass) {
    console.warn('[Email] SMTP not configured. Skipping send. Would have sent:');
    console.warn({ to, subject, text: text || html });
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: Number(smtp.port) === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  return transporter.sendMail({
    from: smtp.from || smtp.user,
    to,
    subject,
    html,
    text,
  });
};

module.exports = sendEmail;
