import { Router } from 'express';
import { rateLimit, type Store, type Options } from 'express-rate-limit';
import { registerUser, login, resetPin, getCurrentUser, adminLogin, changePin } from '../controllers/auth.controller.js';
import { authenticateAdmin } from '../middleware/admin.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

const createTimerFreeStore = (): Store => {
    let windowMs = 0;
    const entries = new Map<string, { totalHits: number; resetTime: Date }>();

    return {
        init(options: Options) {
            windowMs = options.windowMs;
        },
        increment(key) {
            const now = Date.now();
            const existing = entries.get(key);
            if (!existing || existing.resetTime.getTime() <= now) {
                const resetTime = new Date(now + windowMs);
                const entry = { totalHits: 1, resetTime };
                entries.set(key, entry);
                return { totalHits: entry.totalHits, resetTime };
            }

            existing.totalHits += 1;
            return { totalHits: existing.totalHits, resetTime: existing.resetTime };
        },
        decrement(key) {
            const existing = entries.get(key);
            if (existing && existing.totalHits > 0) {
                existing.totalHits -= 1;
            }
        },
        resetKey(key) {
            entries.delete(key);
        },
        resetAll() {
            entries.clear();
        },
        localKeys: true,
    };
};

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    store: createTimerFreeStore(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const resetLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    store: createTimerFreeStore(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const adminLoginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    store: createTimerFreeStore(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

const changePinLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    store: createTimerFreeStore(),
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
