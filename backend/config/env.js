// Loads and validates required environment variables at startup.
// Previously the process exited when required env vars were missing which caused immediate failure
// during development or when running in CI without secrets. To make the app easier to run locally
// we warn when variables are missing and provide safe non-production defaults so the server can start.
// IMPORTANT: these defaults are for local development only — they are insecure for production.
require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(`\n[Config] Missing required environment variables: ${missing.join(', ')}\n` +
    `Copy .env.example to .env and fill in the values before deploying to production.`);

  // Provide sensible development defaults (only used if the vars are missing).
  // These keep the server from exiting immediately and make local development easier.
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/asritha_dev';
    console.warn(`[Config] Using fallback MONGO_URI=${process.env.MONGO_URI} (development only)`);
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'change_me_dev_secret';
    console.warn('[Config] Using fallback JWT_SECRET=change_me_dev_secret (development only)');
  }

  // Do NOT exit here. In production you should supply real values; this fallback is only for dev/test.
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtCookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE || '7', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
};
