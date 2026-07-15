import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);

app.listen(PORT, () => {
  console.log(`MeetForge API running on http://localhost:${PORT}`);
});
