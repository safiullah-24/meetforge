import Meeting from '../models/Meeting.js';
import generateMeetingCode from '../utils/generateMeetingCode.js';

const normalizeTitle = (title) => title?.trim() || '';

const getMeetingResponse = (meeting, hostUser) => ({
  id: meeting._id,
  title: meeting.title,
  meetingCode: meeting.meetingCode,
  status: meeting.status,
  host: hostUser || meeting.host,
  participants: meeting.participants,
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt,
});

const createMeeting = async (req, res) => {
  try {
    const title = normalizeTitle(req.body?.title);
    const hostId = req.user?._id;

    let meeting = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const meetingCode = generateMeetingCode();

      try {
        meeting = await Meeting.create({
          title,
          meetingCode,
          host: hostId,
          participants: [hostId],
          status: 'scheduled',
        });
        break;
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }

    if (!meeting) {
      return res.status(500).json({ message: 'Failed to generate a unique meeting code.' });
    }

    const populatedMeeting = await Meeting.findById(meeting._id).populate('host', 'name email');

    return res.status(201).json({
      message: 'Meeting created successfully.',
      meeting: getMeetingResponse(populatedMeeting, populatedMeeting?.host),
    });
  } catch (error) {
    console.error('Create meeting error:', error.message);
    return res.status(500).json({ message: 'Failed to create meeting.' });
  }
};

const joinMeeting = async (req, res) => {
  try {
    const meetingCode = req.body?.meetingCode?.trim().toUpperCase();

    if (!meetingCode) {
      return res.status(400).json({ message: 'Meeting code is required.' });
    }

    if (!/^[A-Z0-9]{8}$/.test(meetingCode)) {
      return res.status(400).json({ message: 'Meeting code must be 8 uppercase letters or numbers.' });
    }

    const meeting = await Meeting.findOne({ meetingCode }).populate('host', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }

    const userId = req.user._id.toString();
    const participantIds = meeting.participants.map((participantId) => participantId.toString());

    if (!participantIds.includes(userId)) {
      meeting.participants.push(req.user._id);
      await meeting.save();
    }

    return res.status(200).json({
      message: 'Joined meeting successfully.',
      meeting: getMeetingResponse(meeting, meeting.host),
    });
  } catch (error) {
    console.error('Join meeting error:', error.message);
    return res.status(500).json({ message: 'Failed to join meeting.' });
  }
};

const getMyMeetings = async (req, res) => {
  try {
    const userId = req.user._id;

    const meetings = await Meeting.find({
      $or: [{ host: userId }, { participants: userId }],
    })
      .populate('host', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      meetings: meetings.map((meeting) => getMeetingResponse(meeting, meeting.host)),
    });
  } catch (error) {
    console.error('Fetch meetings error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch meetings.' });
  }
};

export { createMeeting, joinMeeting, getMyMeetings };