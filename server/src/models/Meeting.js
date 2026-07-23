import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;