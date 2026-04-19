import mongoose from 'mongoose';
import crypto from 'crypto';

// Use a secure key from environment, fallback for demonstration purposes
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); 
const IV_LENGTH = 16; 

function encrypt(text) {
    if (!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return text;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const merchantSchema = new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    businessName: { type: String, required: true },
    // Implementing Field-Level Encryption (FLE) automatically during saving
    accountNumber: {
        type: String,
        required: true,
        set: encrypt,
        get: decrypt
    },
    riskProfile: { type: String },
    creditScore: { type: Number }
}, { 
    timestamps: true,
    toJSON: { getters: true } // Ensure decryptions are processed when fetching
});

export const Merchant = mongoose.model('Merchant', merchantSchema);
