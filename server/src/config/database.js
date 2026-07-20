// Workaround for environments where the default DNS resolver
// fails MongoDB Atlas SRV lookups.
import dns from "node:dns";
dns.setServers(["8.8.8.8"]);

import mongoose from 'mongoose';
/**
 * Establishes a MongoDB connection for MeetForge using Mongoose.
 * The connection string is loaded from the MONGODB_URI environment variable.
 */

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined. Add it to your .env file.');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

export default connectToDatabase;
