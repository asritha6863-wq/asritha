require('./config/env'); // validates required env vars first, fails fast if missing
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections without crashing silently
  process.on('unhandledRejection', (err) => {
    console.error(`[UnhandledRejection] ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
