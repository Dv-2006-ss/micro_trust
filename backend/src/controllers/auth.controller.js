import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const memDb = [];

const generateToken = (userId, username) => {
    const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'development_secret_key';
    return jwt.sign({ id: userId.toString(), username }, secret, { expiresIn: '30d' });
};

export const registerUser = async (req, res) => {
    try {
        const { phone_number, primary_bank, password, email } = req.body;

        if (!phone_number || !/^\d{10}$/.test(phone_number)) {
            return res.status(400).json({ message: 'A valid 10-digit phone number is required.' });
        }
        if (!primary_bank) {
            return res.status(400).json({ message: 'Primary bank selection is required.' });
        }

        const initialUsername = req.body.username || `user_${phone_number.slice(-4)}_${primary_bank.toLowerCase()}`;
        const mockId = Date.now().toString();

        // ── Memory-DB mode (MongoDB blocked by WiFi) ──────────────────────
        if (mongoose.connection.readyState !== 1) {
            console.warn('[Auth] MongoDB offline. Using Secure Ephemeral RAM Storage.');
            if (memDb.find(u => u.phone_number === phone_number)) {
                return res.status(400).json({ message: 'This phone number is already registered.' });
            }
            if (memDb.find(u => u.email === email)) {
                return res.status(400).json({ message: 'This email is already registered.' });
            }
            if (memDb.find(u => u.username === initialUsername)) {
                return res.status(400).json({ message: 'Username is already taken.' });
            }
            const memUser = { _id: mockId, username: initialUsername, phone_number, primary_bank, email, password };
            memDb.push(memUser);
            return res.status(201).json({
                _id: mockId, username: initialUsername, phone_number, primary_bank, email,
                token: generateToken(mockId, initialUsername)
            });
        }

        // ── MongoDB online ────────────────────────────────────────────────
        const userExists = await User.findOne({ 
            $or: [{ phone_number }, { username: initialUsername }, { email }]
        });
        if (userExists) {
            return res.status(400).json({ message: 'This email or phone number is already registered.' });
        }

        const user = await User.create({ username: initialUsername, phone_number, primary_bank, email, password });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                phone_number: user.phone_number,
                primary_bank: user.primary_bank,
                email: user.email,
                token: generateToken(user._id, user.username),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data.' });
        }
    } catch (error) {
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
            console.warn(`[Register] Duplicate key error for ${duplicateField}`);
            return res.status(400).json({ 
                message: `The ${duplicateField} you entered is already registered. Please login or try another.`,
                error: 'E11000 duplicate key'
            });
        }
        console.error('[Register Error]', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
};

export const checkUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ message: 'Username is required.' });
        
        let exists = false;
        if (mongoose.connection.readyState !== 1) {
            exists = memDb.some(u => u.username === username);
        } else {
            const user = await User.findOne({ username });
            exists = !!user;
        }

        res.json({ available: !exists });
    } catch (error) {
        console.error('[Check Username Error]', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        // ── Memory-DB mode ───────────────────────────────────────────────
        if (mongoose.connection.readyState !== 1) {
            const user = memDb.find(u => u.username === username && u.password === password);
            if (user) {
                return res.json({
                    _id: user._id, username: user.username,
                    phone_number: user.phone_number, primary_bank: user.primary_bank,
                    email: user.email, token: generateToken(user._id, user.username)
                });
            }
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // ── MongoDB online ───────────────────────────────────────────────
        const user = await User.findOne({ username });
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                phone_number: user.phone_number,
                primary_bank: user.primary_bank,
                email: user.email,
                token: generateToken(user._id, user.username),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
};

// ── PATCH /api/auth/profile ──────────────────────────────────────────────────
// Updates username, phone_number, email, primary_bank for the logged-in user.
export const updateProfile = async (req, res) => {
    try {
        const { username, phone_number, email, primary_bank } = req.body;
        const userId = req.user._id;

        const SUPPORTED_BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB',
            'Bank of Baroda', 'Canara Bank', 'IDFC FIRST', 'IndusInd', 'Federal Bank', 'Union Bank'];

        if (primary_bank && !SUPPORTED_BANKS.includes(primary_bank)) {
            return res.status(400).json({ message: `Unsupported bank. Choose from: ${SUPPORTED_BANKS.join(', ')}` });
        }

        // ── Memory-DB mode ───────────────────────────────────────────────
        if (mongoose.connection.readyState !== 1) {
            const idx = memDb.findIndex(u => u._id === userId);
            if (idx === -1) return res.status(404).json({ message: 'User not found.' });

            // Duplicate checks within memDb
            if (email && memDb.some((u, i) => i !== idx && u.email === email)) {
                return res.status(409).json({ message: 'Email already registered to another account.', error: 'E11000' });
            }
            if (phone_number && memDb.some((u, i) => i !== idx && u.phone_number === phone_number)) {
                return res.status(409).json({ message: 'Phone number already registered to another account.', error: 'E11000' });
            }
            if (username && memDb.some((u, i) => i !== idx && u.username === username)) {
                return res.status(409).json({ message: 'Username already taken.', error: 'E11000' });
            }

            const u = memDb[idx];
            if (username)     u.username     = username;
            if (phone_number) u.phone_number = phone_number;
            if (email)        u.email        = email;
            if (primary_bank) u.primary_bank = primary_bank;

            return res.json({
                _id: u._id, username: u.username,
                phone_number: u.phone_number, primary_bank: u.primary_bank,
                email: u.email, token: generateToken(u._id, u.username)
            });
        }

        // ── MongoDB online ───────────────────────────────────────────────
        const updates = {};
        if (username)     updates.username     = username.trim();
        if (phone_number) updates.phone_number = phone_number.trim();
        if (email)        updates.email        = email.trim().toLowerCase();
        if (primary_bank) updates.primary_bank = primary_bank;

        const updated = await User.findByIdAndUpdate(
            userId, { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updated) return res.status(404).json({ message: 'User not found.' });

        res.json({
            _id: updated._id,
            username: updated.username,
            phone_number: updated.phone_number,
            primary_bank: updated.primary_bank,
            email: updated.email,
            token: generateToken(updated._id, updated.username)
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0] || 'field';
            return res.status(409).json({
                message: `The ${field} you entered is already used by another account.`,
                error: 'E11000',
                field
            });
        }
        console.error('[UpdateProfile Error]', error);
        res.status(500).json({ message: 'Server error during profile update.', error: error.message });
    }
};
