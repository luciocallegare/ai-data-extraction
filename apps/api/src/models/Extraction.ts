import mongoose from 'mongoose';

const extractionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inputText: { type: String, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    promptVersion: { type: String, required: true },
    model: { type: String, required: true },
    provider: { type: String, required: true },
    tokensIn: { type: Number, required: true },
    tokensOut: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    parentExtractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Extraction', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index: documents auto-delete 30 days after creation.
extractionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Extraction = mongoose.model('Extraction', extractionSchema);
