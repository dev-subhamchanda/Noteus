import { MongoClient, type Collection } from 'mongodb';
import process from 'node:process';
import { hashAdminPassword, normalizeAdminUsername } from './admin-auth.service.js';

export interface UserDocument {
    rollNumber: string;
    email: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    pinHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminDocument {
    username: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UploadLogDocument {
    userId: string;
    rollNumber: string;
    email: string;
    firstName?: string;
    semesterId?: string;
    semesterName?: string;
    subjectId?: string;
    originalName: string;
    subject: string;
    size: number;
    status: 'pending' | 'uploaded' | 'failed' | 'deleted';
    url?: string;
    publicId?: string;
    downloadUrl?: string;
    createdAt: Date;
    deletedAt?: Date;
}

export interface SubjectFolderDocument {
    id: string;
    key: string;
    name: string;
}

export interface SemesterDocument {
    name: string;
    key: string;
    subjects: SubjectFolderDocument[];
    createdAt: Date;
    updatedAt: Date;
}

let users: Collection<UserDocument> | undefined;
let admins: Collection<AdminDocument> | undefined;
let uploadLogs: Collection<UploadLogDocument> | undefined;
let semesters: Collection<SemesterDocument> | undefined;

export const connectDatabase = async (): Promise<void> => {
    const uri = process.env.MONGODB_URI;
    const databaseName = process.env.MONGODB_DB ?? 'notes';

    if (!uri) {
        throw new Error('MONGODB_URI is required');
    }

    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db(databaseName);
    users = database.collection<UserDocument>('users');
    admins = database.collection<AdminDocument>('admins');
    uploadLogs = database.collection<UploadLogDocument>('uploadLogs');
    semesters = database.collection<SemesterDocument>('semesters');
    await users.createIndex({ rollNumber: 1 }, { unique: true });
    await admins.createIndex({ username: 1 }, { unique: true });
    await uploadLogs.createIndex({ createdAt: -1 });
    await semesters.createIndex({ key: 1 }, { unique: true });

    const configuredUsername = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (Boolean(configuredUsername) !== Boolean(password)) {
        throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must both be configured');
    }

    if (configuredUsername && password) {
        const username = normalizeAdminUsername(configuredUsername);
        if (!username || username.length > 64) {
            throw new Error('ADMIN_USERNAME must be between 1 and 64 characters');
        }
        const passwordHash = await hashAdminPassword(password);
        const now = new Date();
        await admins.updateOne(
            { username },
            {
                $set: { passwordHash, updatedAt: now },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true },
        );
    }
};

export const getUsersCollection = (): Collection<UserDocument> => {
    if (!users) {
        throw new Error('Database has not been connected');
    }
    return users;
};

export const getAdminsCollection = (): Collection<AdminDocument> => {
    if (!admins) {
        throw new Error('Database has not been connected');
    }
    return admins;
};

export const getUploadLogsCollection = (): Collection<UploadLogDocument> => {
    if (!uploadLogs) {
        throw new Error('Database has not been connected');
    }
    return uploadLogs;
};

export const getSemestersCollection = (): Collection<SemesterDocument> => {
    if (!semesters) {
        throw new Error('Database has not been connected');
    }
    return semesters;
};