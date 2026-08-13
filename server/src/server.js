import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import connectToDatabase from './config/database.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import initializeSocket from './socket/socket.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';
const server = http.createServer(app);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

initializeSocket(server, { corsOrigin: CLIENT_ORIGIN });

const startServer = async () => {
  try {
    await connectToDatabase();

    server.listen(PORT, () => {
      console.log(`MeetForge API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
