import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { registerUser, login, resetPin, getCurrentUser, adminLogin, changePin } from '../controllers/auth.controller.js';
import { authenticateAdmin } from '../middleware/admin.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const resetLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const adminLoginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const changePinLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

router.post('/admin/login', adminLoginLimit, adminLogin);
router.post('/register', authenticateAdmin, registerUser);
router.post('/login', loginLimit, login);
router.post('/reset-pin', resetLimit, resetPin);
router.post('/change-pin', authenticateUser, changePinLimit, changePin);
router.get('/me', authenticateUser, getCurrentUser);

export default router;
