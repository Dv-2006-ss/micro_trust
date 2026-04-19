import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.Mixed, // supports both ObjectId and string (mem-db mode)
        required: true,
        index: true
    },
    merchantId: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year:  { type: Number, required: true },
    credit_score: { type: Number, required: true },
    risk_level: { type: String, enum: ['Low', 'Medium', 'High'] },
    approval_status: { type: Boolean, default: false },
    persona: { type: String },
    suggested_interest: { type: String },
    roast: { type: String },
    forecast: { type: Array, default: [] },
    shap: { type: Object, default: {} },
    recommended_cards: { type: Array, default: [] },
    banks: { type: Array, default: [] },
    primary_bank: { type: String, default: 'HDFC' },
    filename: { type: String, default: 'statement.pdf' },
}, { timestamps: true });

// Compound index: one report per user per month/year
reportSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);
