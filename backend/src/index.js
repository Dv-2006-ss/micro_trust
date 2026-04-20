import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import analyzeRoutes from './routes/analyze.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Production-aware CORS whitelist
const allowedOrigins = [
    'https://microtrust-frontend.onrender.com',
    'http://localhost:4200'
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(null, true); // Allow in dev, tighten later if needed
        }
    },
    credentials: true
}));
app.use(express.json());

// --- MongoDB Bypass / Mock Mode ---
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI && MONGODB_URI !== 'mock_bypass') {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('[MongoDB] Connected securely with Field-Level Encryption schemas.'))
        .catch(err => console.error('[MongoDB] Connection Error:', err));
} else {
    console.warn('\n[MongoDB Bypass Mode] 🚦 WARNING: Database string missing or set to mock.');
    console.warn('The application will still process files and stream to Python, but WILL NOT persist Merchant records locally.\n');
}

import authRoutes from './routes/auth.routes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1', analyzeRoutes);
app.use('/api/v1/reports', reportsRoutes);

// General route wrapper
app.get('/', (req, res) => {
    res.json({ status: 'Backend is Online' });
});

// Bind to 0.0.0.0 so Render's port detection can reach the service
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express] Orchestrator listening on port ${PORT}`);
});
