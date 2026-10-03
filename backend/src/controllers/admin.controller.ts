import type { RequestHandler } from 'express';
import { ObjectId } from 'mongodb';
import { getSemestersCollection, getUploadLogsCollection, getUsersCollection } from '../services/database.service.js';
import { parseCsv } from '../services/csv.service.js';
import { createUserAccount, type NewUserDetails } from '../services/user-account.service.js';

export const listUsers: RequestHandler = async (_req, res) => {
    const users = await getUsersCollection()
        .find({}, { projection: { pinHash: 0 } })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

    res.json({
        users: users.map(({ _id, ...user }) => ({ id: _id.toString(), ...user })),
    });
};

export const listUploadActivity: RequestHandler = async (_req, res) => {
    const uploads = await getUploadLogsCollection()
        .find()
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

    res.json({
        uploads: uploads.map(({ _id, ...upload }) => ({ id: _id.toString(), ...upload })),
    });
};

export const listSemesters: RequestHandler = async (_req, res) => {
    const semesters = await getSemestersCollection().find().sort({ createdAt: 1 }).toArray();
    res.json({
        semesters: semesters.map(({ _id, ...semester }) => ({ id: _id.toString(), ...semester })),
    });
};

export const createSemester: RequestHandler = async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 80) {
        res.status(400).json({ message: 'Semester name is required and must be 80 characters or fewer' });
        return;
    }

    const key = name.toLowerCase();
    try {
        await getSemestersCollection().insertOne({
            name,
            key,
            subjects: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            res.status(409).json({ message: 'A semester with this name already exists' });
            return;
        }
        throw error;
    }

    res.status(201).json({ message: 'Semester created' });
};

export const createSubject: RequestHandler = async (req, res) => {
    const { semesterId } = req.params;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (typeof semesterId !== 'string' || !/^[a-f\d]{24}$/i.test(semesterId)) {
        res.status(400).json({ message: 'A valid semester ID is required' });
        return;
    }
    if (!name || name.length > 100) {
        res.status(400).json({ message: 'Subject name is required and must be 100 characters or fewer' });
        return;
    }

    const key = name.toLowerCase();
    const result = await getSemestersCollection().updateOne(
        { _id: new ObjectId(semesterId), 'subjects.key': { $ne: key } },
        {
            $push: { subjects: { id: new ObjectId().toString(), key, name } },
            $set: { updatedAt: new Date() },
        },
    );
    if (result.matchedCount) {
        res.status(201).json({ message: 'Subject created' });
        return;
    }

    const semester = await getSemestersCollection().findOne({ _id: new ObjectId(semesterId) });
    if (!semester) {
        res.status(404).json({ message: 'Semester not found' });
        return;
    }
    res.status(409).json({ message: 'A subject with this name already exists in this semester' });
};

export const deleteSemester: RequestHandler = async (req, res) => {
    const { semesterId } = req.params;
    if (typeof semesterId !== 'string' || !/^[a-f\d]{24}$/i.test(semesterId)) {
        res.status(400).json({ message: 'A valid semester ID is required' });
        return;
    }

    const id = new ObjectId(semesterId);
    const semester = await getSemestersCollection().findOne({ _id: id });
    if (!semester) {
        res.status(404).json({ message: 'Semester not found' });
        return;
    }
    const hasUploads = await getUploadLogsCollection().findOne({ semesterId, status: { $in: ['pending', 'uploaded'] } });
    if (hasUploads) {
        res.status(409).json({ message: 'This semester has uploaded notes and cannot be deleted' });
        return;
    }

    await getSemestersCollection().deleteOne({ _id: id });
    res.json({ message: 'Semester deleted' });
};

export const deleteSubject: RequestHandler = async (req, res) => {
    const { semesterId, subjectId } = req.params;
    if (
        typeof semesterId !== 'string' || !/^[a-f\d]{24}$/i.test(semesterId) ||
        typeof subjectId !== 'string' || !/^[a-f\d]{24}$/i.test(subjectId)
    ) {
        res.status(400).json({ message: 'Valid semester and subject IDs are required' });
        return;
    }

    const semester = await getSemestersCollection().findOne({ _id: new ObjectId(semesterId) });
    if (!semester) {
        res.status(404).json({ message: 'Semester not found' });
        return;
    }
    if (!semester.subjects.some((subject) => subject.id === subjectId)) {
        res.status(404).json({ message: 'Subject not found' });
        return;
    }
    const hasUploads = await getUploadLogsCollection().findOne({ subjectId, status: { $in: ['pending', 'uploaded'] } });
    if (hasUploads) {
        res.status(409).json({ message: 'This subject has uploaded notes and cannot be deleted' });
        return;
    }

    await getSemestersCollection().updateOne(
        { _id: new ObjectId(semesterId) },
        { $pull: { subjects: { id: subjectId } }, $set: { updatedAt: new Date() } },
    );
    res.json({ message: 'Subject deleted' });
};

export const deleteUser: RequestHandler = async (req, res) => {
    const { id } = req.params;
    if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({ message: 'A valid user ID is required' });
        return;
    }

    const result = await getUsersCollection().deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    res.json({ message: 'User account deleted. Previously uploaded shared notes were not removed.' });
};

const requiredCsvHeaders = ['rollnumber', 'email', 'firstname', 'lastname'];
const maximumCsvUsers = 100;
const csvRowError = (status: string): string => {
    switch (status) {
        case 'invalid':
            return 'Valid first name, last name, roll number, and email are required';
        case 'duplicate':
            return 'A user with this roll number already exists';
        case 'email-failed':
            return 'PIN email could not be sent; the account was not created';
        default:
            return 'The account could not be created because of a server error';
    }
};

export const importUsers: RequestHandler = async (req, res) => {
    let rows: string[][];
    try {
        rows = parseCsv(req.file!.buffer.toString('utf8'));
    } catch (error) {
        res.status(400).json({
            message: error instanceof Error ? error.message : 'CSV file could not be parsed',
        });
        return;
    }

    if (rows.length < 2) {
        res.status(400).json({ message: 'CSV must include a header row and at least one account' });
        return;
    }

    const headers = rows[0]!.map((header) => header.trim().toLowerCase());
    if (new Set(headers).size !== headers.length || requiredCsvHeaders.some((header) => !headers.includes(header))) {
        res.status(400).json({
            message: 'CSV headers must include rollNumber, email, firstName, and lastName; middleName is optional',
        });
        return;
    }

    const records = rows.slice(1);
    if (records.length > maximumCsvUsers) {
        res.status(413).json({ message: `A maximum of ${maximumCsvUsers} accounts can be imported at once` });
        return;
    }

    const column = (name: string): number => headers.indexOf(name.toLowerCase());
    const detailsForRow = (values: string[]): NewUserDetails | null => {
        if (values.length !== headers.length) return null;
        return {
            rollNumber: values[column('rollNumber')] ?? '',
            email: values[column('email')] ?? '',
            firstName: values[column('firstName')] ?? '',
            middleName: column('middleName') === -1 ? '' : values[column('middleName')] ?? '',
            lastName: values[column('lastName')] ?? '',
        };
    };

    const outcomes: Array<{ row: number; rollNumber: string; message: string } | null> =
        Array.from({ length: records.length }, () => null);
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
        while (nextIndex < records.length) {
            const index = nextIndex;
            nextIndex += 1;
            const details = detailsForRow(records[index]!);
            if (!details) {
                outcomes[index] = { row: index + 2, rollNumber: '', message: 'Row has a different number of columns than the header' };
                continue;
            }

            try {
                const result = await createUserAccount(details);
                if (result.status !== 'created') {
                    outcomes[index] = {
                        row: index + 2,
                        rollNumber: details.rollNumber.trim(),
                        message: csvRowError(result.status),
                    };
                }
            } catch (error) {
                console.error(`Unable to import user from CSV row ${index + 2}:`, error);
                outcomes[index] = {
                    row: index + 2,
                    rollNumber: details.rollNumber.trim(),
                    message: csvRowError('server-error'),
                };
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(5, records.length) }, () => worker()));
    const failed = outcomes.filter((outcome): outcome is NonNullable<typeof outcome> => outcome !== null);
    res.status(200).json({
        created: records.length - failed.length,
        failed,
    });
};
