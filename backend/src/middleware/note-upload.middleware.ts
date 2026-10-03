import multer from 'multer';
import type { RequestHandler } from 'express';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
            callback(new Error('Only PDF files are allowed'));
            return;
        }

        callback(null, true);
    },
});

export const uploadNotePdf: RequestHandler = (req, res, next) => {
    upload.single('file')(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            res.status(status).json({ message: status === 413 ? 'File must not exceed 3 MB' : error.message });
            return;
        }

        if (error) {
            res.status(400).json({ message: 'Only PDF files are allowed' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'A PDF file is required in the "file" field' });
            return;
        }

        if (!req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
            res.status(400).json({ message: 'The uploaded file is not a valid PDF' });
            return;
        }

        next();
    });
};