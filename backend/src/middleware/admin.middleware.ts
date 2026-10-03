import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import process from 'node:process';

export const authenticateAdmin: RequestHandler = (req, res, next) => {
    const authorization = req.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
        res.status(401).json({ message: 'Admin login required' });
        return;
    }

    try {
        const payload = jwt.verify(token, secret);
        if (
            typeof payload === 'string'
            || payload.role !== 'admin'
            || typeof payload.sub !== 'string'
            || typeof payload.username !== 'string'
        ) {
            res.status(401).json({ message: 'Admin login required' });
            return;
        }
    } catch {
        res.status(401).json({ message: 'Invalid or expired admin token' });
        return;
    }

    next();
};