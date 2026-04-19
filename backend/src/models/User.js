import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Bank options supported by the Recommendation Engine
export const SUPPORTED_BANKS = [
    'HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB',
    'Bank of Baroda', 'Canara Bank', 'IDFC FIRST', 'IndusInd', 'Federal Bank', 'Union Bank'
];

const userSchema = new mongoose.Schema({
    // Keep username as optional alias — real ID is phone_number
    username: {
        type: String,
        trim: true,
        sparse: true  // allow null without unique conflict
    },
    phone_number: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,   // allow multiple null emails
        lowercase: true,
        trim: true
    },
    primary_bank: {
        type: String,
        required: true,
        enum: SUPPORTED_BANKS,
        default: 'HDFC'
    },
    password: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Pre-save hook to hash passwords
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Auto-generate username from phone if not provided
userSchema.pre('save', function(next) {
    if (!this.username && this.phone_number) {
        this.username = `user_${this.phone_number.slice(-4)}`;
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
