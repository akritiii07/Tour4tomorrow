import mongoose from 'mongoose';

// One row per chat message. role 'user' = the traveller, 'assistant' = the AI.
const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 8000 },
    provider: String, // which AI produced an assistant reply (gemini / anthropic)
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: -1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
