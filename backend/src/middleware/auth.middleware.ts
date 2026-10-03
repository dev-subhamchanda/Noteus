import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import process from 'node:process';

export interface AuthenticatedRequest extends Request {
    auth: {
        userId: string;
        rollNumber: string;
    };
}

export const authenticateUser: RequestHandler = (req, res, next) => {
    const authorization = req.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        const payload = jwt.verify(token, secret);
        if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.rollNumber !== 'string') {
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }

        (req as AuthenticatedRequest).auth = {
            userId: payload.sub,
            rollNumber: payload.rollNumber,
        };
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};