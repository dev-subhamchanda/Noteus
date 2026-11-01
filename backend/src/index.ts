import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type { ErrorRequestHandler } from 'express';
import authRouter from './routes/auth.route.js';
import adminRouter from './routes/admin.route.js';
import notesRouter from './routes/notes.route.js';
import { connectDatabase } from './services/database.service.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const frontendOrigins = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors(frontendOrigins.length ? {
    origin: frontendOrigins,
    credentials: true,
} : { origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Noteus API is running!',
    });
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notes', notesRouter);

app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    console.error('Request failed:', error);
    res.status(500).json({ message: 'Internal server error' });
};
app.use(errorHandler);

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
    app.listen(port, () => {
        console.log(`Noteus API listening on port ${port}`);
    });
}

connectDatabase().catch((error: unknown) => {
    console.error('Unable to connect to the database:', error);
});

export default app;