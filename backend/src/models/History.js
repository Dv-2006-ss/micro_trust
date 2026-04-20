import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    displayName: { type: String },
    creditScore: { type: Number, required: true },
    persona: { type: String, required: true },
    interestRate: { type: String },
    timestamp: { type: Date, default: Date.now }
});

export const History = mongoose.model('History', historySchema);
