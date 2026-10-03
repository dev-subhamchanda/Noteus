import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getUsersCollection, type UserDocument } from './database.service.js';
import { sendPinEmail } from './email.service.js';

export type NewUserDetails = {
    rollNumber: string;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
};

export type CreateUserResult =
    | { status: 'created' }
    | { status: 'invalid' }
    | { status: 'duplicate' }
    | { status: 'email-failed' };

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const generatePin = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

export const createUserAccount = async (details: NewUserDetails): Promise<CreateUserResult> => {
    const rollNumber = details.rollNumber.trim();
    const email = details.email.trim().toLowerCase();
    const firstName = details.firstName.trim();
    const middleName = details.middleName.trim();
    const lastName = details.lastName.trim();

    if (
        !rollNumber || rollNumber.length > 64 || !isEmail(email) ||
        !firstName || firstName.length > 80 || middleName.length > 80 ||
        !lastName || lastName.length > 80
    ) {
        return { status: 'invalid' };
    }

    const users = getUsersCollection();
    const pin = generatePin();
    const now = new Date();
    const user: Omit<UserDocument, '_id'> = {
        rollNumber,
        email,
        firstName,
        middleName,
        lastName,
        pinHash: await bcrypt.hash(pin, 12),
        createdAt: now,
        updatedAt: now,
    };

    let insertedId;
    try {
        const result = await users.insertOne(user);
        insertedId = result.insertedId;
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            return { status: 'duplicate' };
        }
        throw error;
    }

    try {
        await sendPinEmail(email, pin, 'created');
    } catch (error) {
        console.error('Unable to email the initial user PIN:', error);
        await users.deleteOne({ _id: insertedId });
        return { status: 'email-failed' };
    }

    return { status: 'created' };
};
