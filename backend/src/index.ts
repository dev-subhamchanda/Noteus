import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import process from 'node:process';
import authRouter from './routes/auth.route.js';
import adminRouter from './routes/admin.route.js';
import notesRouter from './routes/notes.route.js';
import { connectDatabase } from './services/database.service.js';
import {httpServerHandler} from 'cloudflare:node'
dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 3000);

const frontendOrigins = process.env.FRONTEND_ORIGINS as string ?? '*';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Noteus API is running!',
        platform: 'Cloudflare Workers',
    });
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notes', notesRouter);

app.listen(port);


connectDatabase().catch((error: unknown) => {
    console.error('Unable to start server:', error);
    process.exitCode = 1;
});

export default httpServerHandler({port})