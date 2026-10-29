import mongoose from 'mongoose';

// Every change to a user's Carbon Points is recorded here (like a bank
// statement). This powers the "Points History" tab and lets us audit or
// recompute balances. Negative amounts = points reversed (e.g. ride cancelled).
const pointsTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 120 },
    refType: { type: String, enum: ['trip', 'ride'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Compound index → fast "this user's history, newest first" queries.
pointsTransactionSchema.index({ user: 1, createdAt: -1 });

export const PointsTransaction = mongoose.model('PointsTransaction', pointsTransactionSchema);
