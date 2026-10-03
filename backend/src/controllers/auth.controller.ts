import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import process from 'node:process';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getAdminsCollection, getUsersCollection } from '../services/database.service.js';
import { normalizeAdminUsername, verifyAdminPassword } from '../services/admin-auth.service.js';
import { sendPinEmail } from '../services/email.service.js';
import { createUserAccount } from '../services/user-account.service.js';

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const generatePin = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');
const getBody = (body: unknown): Record<string, unknown> =>
    body !== null && typeof body === 'object' && !Array.isArray(body)
        ? body as Record<string, unknown>
        : {};

export const adminLogin: RequestHandler = async (req, res) => {
    const body = getBody(req.body);
    const username = typeof body.username === 'string' ? normalizeAdminUsername(body.username) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const secret = process.env.JWT_SECRET;

    if (!secret || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
        res.status(503).json({ message: 'Admin authentication is not configured' });
        return;
    }
    if (!username || username.length > 64 || !password) {
        res.status(400).json({ message: 'A valid admin username and password are required' });
        return;
    }
    try {
        const admin = await getAdminsCollection().findOne({ username });
        if (!admin || !(await verifyAdminPassword(password, admin.passwordHash))) {
            res.status(401).json({ message: 'Invalid admin username or password' });
            return;
        }

        const token = jwt.sign({ role: 'admin', username: admin.username }, secret, {
            subject: admin._id.toString(),
            expiresIn: '8h',
        });

        res.json({ token, username: admin.username });
    } catch (error) {
        console.error('Admin login failed:', error);
        res.status(500).json({ message: 'Unable to sign in as admin' });
    }
};

export const registerUser: RequestHandler = async (req, res) => {
    const body = getBody(req.body);
    const result = await createUserAccount({
        rollNumber: typeof body.rollNumber === 'string' ? body.rollNumber : '',
        email: typeof body.email === 'string' ? body.email : '',
        firstName: typeof body.firstName === 'string' ? body.firstName : '',
        middleName: typeof body.middleName === 'string' ? body.middleName : '',
        lastName: typeof body.lastName === 'string' ? body.lastName : '',
    });

    if (result.status === 'invalid') {
        res.status(400).json({ message: 'Valid first name, last name, roll number, and email are required; each name must be 80 characters or fewer' });
        return;
    }
    if (result.status === 'duplicate') {
        res.status(409).json({ message: 'A user with this roll number already exists' });
        return;
    }
    if (result.status === 'email-failed') {
        res.status(503).json({ message: 'Unable to send the PIN email; registration was not completed' });
        return;
    }

    res.status(201).json({ message: 'User registered and PIN emailed' });
};

export const login: RequestHandler = async (req, res) => {
    const body = getBody(req.body);
    const rollNumber = typeof body.rollNumber === 'string' ? body.rollNumber.trim() : '';
    const pin = typeof body.pin === 'string' ? body.pin : '';

    if (!rollNumber || !/^\d{6}$/.test(pin)) {
        res.status(400).json({ message: 'A rollNumber and six-digit pin are required' });
        return;
    }

    const user = await getUsersCollection().findOne({ rollNumber });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
        res.status(401).json({ message: 'Invalid roll number or PIN' });
        return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(503).json({ message: 'Authentication is not configured' });
        return;
    }

    const token = jwt.sign({ rollNumber: user.rollNumber }, secret, {
        subject: user._id.toString(),
        expiresIn: '12h',
    });

    res.json({
        token,
        user: {
            rollNumber: user.rollNumber,
            email: user.email,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
        },
    });
};

export const changePin: RequestHandler = async (req, res) => {
    const { userId, rollNumber } = (req as AuthenticatedRequest).auth;
    const body = getBody(req.body);
    const currentPin = typeof body.currentPin === 'string' ? body.currentPin : '';
    const newPin = typeof body.newPin === 'string' ? body.newPin : '';

    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
        res.status(400).json({ message: 'Current PIN and new PIN must each be six digits' });
        return;
    }
    if (currentPin === newPin) {
        res.status(400).json({ message: 'Your new PIN must be different from your current PIN' });
        return;
    }

    const users = getUsersCollection();
    const user = await users.findOne({ rollNumber });
    if (!user || user._id.toString() !== userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (!(await bcrypt.compare(currentPin, user.pinHash))) {
        res.status(400).json({ message: 'Current PIN is incorrect' });
        return;
    }

    const updatedAt = new Date();
    const result = await users.updateOne(
        { _id: user._id, pinHash: user.pinHash },
        { $set: { pinHash: await bcrypt.hash(newPin, 12), updatedAt } },
    );
    if (!result.modifiedCount) {
        res.status(409).json({ message: 'PIN changed in another request; please try again' });
        return;
    }

    res.json({ message: 'PIN changed successfully' });
};

export const resetPin: RequestHandler = async (req, res) => {
    const body = getBody(req.body);
    const rollNumber = typeof body.rollNumber === 'string' ? body.rollNumber.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const genericResponse = { message: 'If the roll number and email match, a new PIN will be emailed' };

    if (!rollNumber || !isEmail(email)) {
        res.status(200).json(genericResponse);
        return;
    }

    const users = getUsersCollection();
    const user = await users.findOne({ rollNumber, email });
    if (!user) {
        res.status(200).json(genericResponse);
        return;
    }

    const pin = generatePin();
    const newPinHash = await bcrypt.hash(pin, 12);
    const updatedAt = new Date();
    await users.updateOne({ _id: user._id }, { $set: { pinHash: newPinHash, updatedAt } });

    try {
        await sendPinEmail(email, pin, 'reset');
    } catch {
        await users.updateOne(
            { _id: user._id, pinHash: newPinHash },
            { $set: { pinHash: user.pinHash, updatedAt: user.updatedAt } },
        );
    }

    res.status(200).json(genericResponse);
};

export const getCurrentUser: RequestHandler = async (req, res) => {
    const { userId, rollNumber } = (req as AuthenticatedRequest).auth;
    const user = await getUsersCollection().findOne({ rollNumber });

    if (!user || user._id.toString() !== userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    res.json({
        user: {
            rollNumber: user.rollNumber,
            email: user.email,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
        },
    });
};