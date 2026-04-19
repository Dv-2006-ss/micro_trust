import express from 'express';
import { saveReport, getHistory, updatePrimaryBank } from '../controllers/reports.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are JWT-protected
router.post('/save',    protect, saveReport);
router.get('/history',  protect, getHistory);
router.patch('/bank',   protect, updatePrimaryBank);

export default router;
