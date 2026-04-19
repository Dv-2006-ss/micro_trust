import express from 'express';
import { registerUser, loginUser, checkUsername, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/check-username', checkUsername);
router.patch('/profile', protect, updateProfile); // ← JWT-protected profile update

export default router;
