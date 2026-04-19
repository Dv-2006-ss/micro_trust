import express from 'express';
import multer from 'multer';
import { analyzePassbook } from '../controllers/analyze.controller.js';
import secureDelete from '../middlewares/secureDelete.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Multer configured to write securely to disk, but our middleware will instantly shred it
const upload = multer({ dest: 'uploads/' });

// Forward stream to FastAPI, then shred local file (Now Protected by JWT)
router.post('/analyze', protect, upload.single('passbook_file'), analyzePassbook, secureDelete);

export default router;
