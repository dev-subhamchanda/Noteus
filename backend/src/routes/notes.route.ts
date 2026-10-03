import { Router } from 'express';
import { listSemesters } from '../controllers/admin.controller.js';
import { getNoteAccessUrl, uploadNote } from '../controllers/notes.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { uploadNotePdf } from '../middleware/note-upload.middleware.js';

const router = Router();

router.get('/semesters', authenticateUser, listSemesters);
router.post('/access-url', authenticateUser, getNoteAccessUrl);
router.post('/upload', authenticateUser, uploadNotePdf, uploadNote);

export default router;