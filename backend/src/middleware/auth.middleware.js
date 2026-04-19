import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extract token
            token = req.headers.authorization.split(' ')[1];
            console.log('[Auth] Token received:', token ? `${token.substring(0, 20)}...` : 'MISSING');

            // Verify signature
            const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
            const decoded = jwt.verify(token, secret);
            console.log('[Auth] Decoded payload — id:', decoded.id, '| username:', decoded.username);

            // ── ObjectId Guard: prevent CastError crashing the server ──────────
            // If MongoDB is offline (mem-db mode), the ID is a timestamp string, not an ObjectId.
            // In that case, skip the DB lookup and build req.user from the JWT payload directly.
            if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
                console.log('[Auth] Non-ObjectId token detected (memory-DB session). Trusting JWT payload directly.');
                req.user = { _id: decoded.id, username: decoded.username };
                return next();
            }

            // MongoDB is connected and ID is a valid ObjectId — do the DB lookup
            if (mongoose.connection.readyState === 1) {
                req.user = await User.findById(decoded.id).select('-password');
                if (!req.user) {
                    return res.status(401).json({ message: 'Not authorized, user no longer exists.' });
                }
            } else {
                // MongoDB offline but valid ObjectId — trust JWT payload to keep demo running
                console.warn('[Auth] MongoDB offline — falling back to JWT payload for req.user.');
                req.user = { _id: decoded.id, username: decoded.username };
            }

            console.log('[Auth] ✓ Request authorized for user:', req.user.username);
            next();
        } catch (error) {
            console.error('[Auth Middleware Error]', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        if (!token) {
            console.warn('[Auth] No token found in Authorization header.');
            res.status(401).json({ message: 'Not authorized, no token' });
        }
    }
};
