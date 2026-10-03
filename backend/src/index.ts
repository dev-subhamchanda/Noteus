import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';
import process from 'node:process';
import authRouter from './routes/auth.route.js';
import adminRouter from './routes/admin.route.js';
import notesRouter from './routes/notes.route.js';
import { connectDatabase } from './services/database.service.js';

const app = express();
const frontendOrigins = (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: frontendOrigins }));
app.use(express.json());
app.use(morgan('dev'));
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notes', notesRouter);

const startServer = async () => {
    await connectDatabase();
    const port = Number(process.env.PORT ?? 3000);

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};

startServer().catch((error: unknown) => {
    console.error('Unable to start server:', error);
    process.exitCode = 1;
});