import express from 'express';
import { History } from '../models/History.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST endpoint that saves the incoming JSON to MongoDB
router.post('/save', protect, async (req, res) => {
    try {
        // Data field names match the 'credit_score' and 'persona' variables from frontend
        const { credit_score, persona, suggested_interest, displayName } = req.body;
        
        const record = new History({
            userId: req.user._id,
            displayName: displayName || 'Untitled History',
            creditScore: credit_score,
            persona: persona,
            interestRate: suggested_interest
        });
        
        await record.save();
        res.status(201).json({ message: 'History saved successfully', record });
    } catch (error) {
        console.error('[History Save Error]', error);
        res.status(500).json({ message: 'Failed to save history', error: error.message });
    }
});

export default router;
