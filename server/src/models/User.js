import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index → duplicate emails are rejected
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // `select: false` means the hash is NEVER returned by queries unless we
    // explicitly ask for it with .select('+passwordHash') (only during login).
    passwordHash: { type: String, required: true, select: false },
    // Denormalised running total. The source of truth is PointsTransaction;
    // keeping a copy here makes the leaderboard query fast.
    carbonPoints: { type: Number, default: 0, min: 0, index: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  // bcrypt with cost 12: slow on purpose, so stolen hashes are hard to crack.
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// What the API sends to the browser — no hash, no internal fields.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    carbonPoints: this.carbonPoints,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
