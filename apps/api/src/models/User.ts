import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    dailyTokenQuota: { type: Number, default: 100_000 },
    tokensUsedToday: { type: Number, default: 0 },
    tokenResetAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
