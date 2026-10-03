import multer from 'multer';
import type { RequestHandler } from 'express';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
            callback(new Error('Only CSV files are allowed'));
            return;
        }

        callback(null, true);
    },
});

export const uploadCsvFile: RequestHandler = (req, res, next) => {
    upload.single('file')(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            res.status(tooLarge ? 413 : 400).json({
                message: tooLarge ? 'CSV file must not exceed 1 MB' : error.message,
            });
            return;
        }

        if (error) {
            res.status(400).json({ message: 'Only CSV files are allowed' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'A CSV file is required in the "file" field' });
            return;
        }

        next();
    });
};
