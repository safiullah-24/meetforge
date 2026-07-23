import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { createMeeting, getMyMeetings, joinMeeting } from '../controllers/meetingController.js';

const router = Router();

router.post('/', protect, createMeeting);
router.post('/join', protect, joinMeeting);
router.get('/my', protect, getMyMeetings);

export default router;