import 'dotenv/config';
console.log('JWT_SECRET =', process.env.JWT_SECRET);
import express from 'express';
import cors from 'cors';
import connectToDatabase from './config/database.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`MeetForge API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
