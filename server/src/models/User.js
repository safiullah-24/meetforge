import mongoose from 'mongoose';

/**
 * User model for MeetForge.
 *
 * This milestone intentionally includes only the profile fields required
 * for the backend foundation and does not add auth-sensitive data.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
