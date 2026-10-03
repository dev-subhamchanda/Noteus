import { Router } from 'express';
import { registerUser } from '../controllers/auth.controller.js';
import {
    createSemester,
    createSubject,
    deleteSemester,
    deleteSubject,
    deleteUpload,
    deleteUser,
    importUsers,
    listSemesters,
    listUploadActivity,
    listUsers,
} from '../controllers/admin.controller.js';
import { authenticateAdmin } from '../middleware/admin.middleware.js';
import { uploadCsvFile } from '../middleware/csv-upload.middleware.js';

const router = Router();

router.use(authenticateAdmin);
router.get('/users', listUsers);
router.post('/users', registerUser);
router.post('/users/import', uploadCsvFile, importUsers);
router.delete('/users/:id', deleteUser);
router.get('/activity', listUploadActivity);
router.delete('/activity/:id', deleteUpload);
router.get('/semesters', listSemesters);
router.post('/semesters', createSemester);
router.delete('/semesters/:semesterId', deleteSemester);
router.post('/semesters/:semesterId/subjects', createSubject);
router.delete('/semesters/:semesterId/subjects/:subjectId', deleteSubject);

export default router;
