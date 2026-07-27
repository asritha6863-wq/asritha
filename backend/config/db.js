const mongoose = require('mongoose');

// Establishes the MongoDB Atlas connection and wires up lifecycle logging.
// Mongoose's built-in reconnection logic (bufferCommands + reconnectTries under
// the hood of the modern driver) handles automatic reconnection; we just log it.
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Mongoose will attempt to reconnect automatically.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected successfully.');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed due to app termination.');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    // Exit so process managers (nodemon/pm2/docker) can restart and retry
    process.exit(1);
  }
};

module.exports = connectDB;
