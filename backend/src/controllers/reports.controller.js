import { Report } from '../models/Report.js';
import mongoose from 'mongoose';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ── POST /api/v1/reports/save ─────────────────────────────────────────────
// Save a fresh analysis result to the user's history archive.
export const saveReport = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const {
            merchantId, credit_score, risk_level, approval_status,
            persona, suggested_interest, roast, forecast, shap,
            recommended_cards, banks, primary_bank, filename,
            month, year
        } = req.body;

        const reportMonth = month  ?? (now.getMonth() + 1);
        const reportYear  = year   ?? now.getFullYear();

        // Upsert: one analysis per user per month/year
        const report = await Report.findOneAndUpdate(
            { userId, month: reportMonth, year: reportYear },
            {
                userId, merchantId, month: reportMonth, year: reportYear,
                credit_score, risk_level, approval_status, persona,
                suggested_interest, roast, forecast: forecast ?? [],
                shap: shap ?? {}, recommended_cards: recommended_cards ?? [],
                banks: banks ?? [], primary_bank: primary_bank ?? 'HDFC',
                filename: filename ?? 'statement.pdf'
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(201).json({
            message: `[DB_SYNC]: Historical statement archived for ${MONTH_NAMES[reportMonth - 1]} ${reportYear}.`,
            report
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Report for this month already archived. Use update instead.' });
        }
        console.error('[SaveReport Error]', error);
        res.status(500).json({ message: 'Failed to save report.', error: error.message });
    }
};

// ── GET /api/v1/reports/history ───────────────────────────────────────────
// Returns a tree-structured JSON: { years: [ { year, months: [ { month, monthName, report } ] } ] }
export const getHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const reports = await Report.find({ userId })
            .sort({ year: -1, month: -1 })
            .lean();

        // Build tree
        const yearMap = new Map();
        for (const rpt of reports) {
            if (!yearMap.has(rpt.year)) yearMap.set(rpt.year, []);
            yearMap.get(rpt.year).push({
                month: rpt.month,
                monthName: MONTH_NAMES[rpt.month - 1],
                reportId: rpt._id,
                credit_score: rpt.credit_score,
                risk_level: rpt.risk_level,
                approval_status: rpt.approval_status,
                persona: rpt.persona,
                primary_bank: rpt.primary_bank,
                filename: rpt.filename,
                createdAt: rpt.createdAt,
                // Full payload for re-hydrating the dashboard
                full: rpt
            });
        }

        const tree = [];
        for (const [year, months] of yearMap.entries()) {
            tree.push({ year, months });
        }

        res.status(200).json({ years: tree, total: reports.length });
    } catch (error) {
        console.error('[GetHistory Error]', error);
        res.status(500).json({ message: 'Failed to fetch history.', error: error.message });
    }
};

// ── PATCH /api/v1/reports/bank ─────────────────────────────────────────────
// Update the user's primary bank preference (persisted on their JWT profile).
export const updatePrimaryBank = async (req, res) => {
    try {
        const { primary_bank } = req.body;
        const SUPPORTED = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'];
        if (!SUPPORTED.includes(primary_bank)) {
            return res.status(400).json({ message: `Unsupported bank. Choose from: ${SUPPORTED.join(', ')}` });
        }

        // If MongoDB is connected, persist to user document
        if (mongoose.connection.readyState === 1) {
            const { User } = await import('../models/User.js');
            await User.findByIdAndUpdate(req.user._id, { primary_bank });
        }

        res.status(200).json({
            message: `Primary bank updated to ${primary_bank}.`,
            primary_bank
        });
    } catch (error) {
        console.error('[UpdateBank Error]', error);
        res.status(500).json({ message: 'Failed to update bank.', error: error.message });
    }
};
