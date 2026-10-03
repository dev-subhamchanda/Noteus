import type { RequestHandler } from 'express';
import { ObjectId } from 'mongodb';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getSemestersCollection, getUploadLogsCollection, getUsersCollection } from '../services/database.service.js';
import { createNoteAccessUrl, isCloudinaryConfigured, uploadNoteToCloudinary } from '../services/cloudinary.service.js';

export const getNoteAccessUrl: RequestHandler = async (req, res) => {
    const { userId } = (req as AuthenticatedRequest).auth;
    const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
    const mode = req.body?.mode;
    if (!publicId || publicId.length > 512 || (mode !== 'view' && mode !== 'download')) {
        res.status(400).json({ message: 'A valid note and access mode are required' });
        return;
    }

    const upload = await getUploadLogsCollection().findOne({
        publicId,
        userId,
        status: 'uploaded',
    });
    if (!upload) {
        res.status(404).json({ message: 'Uploaded note not found' });
        return;
    }

    res.json({
        url: createNoteAccessUrl(publicId, mode === 'download'),
    });
};

export const uploadNote: RequestHandler = async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'A PDF file is required' });
        return;
    }

    if (!isCloudinaryConfigured()) {
        res.status(503).json({ message: 'Cloudinary storage is not configured' });
        return;
    }

    const { userId, rollNumber } = (req as AuthenticatedRequest).auth;
    const user = await getUsersCollection().findOne({ rollNumber });
    if (!user || user._id.toString() !== userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const semesterId = typeof req.body.semesterId === 'string' ? req.body.semesterId : '';
    const subjectId = typeof req.body.subjectId === 'string' ? req.body.subjectId : '';
    if (!/^[a-f\d]{24}$/i.test(semesterId) || !/^[a-f\d]{24}$/i.test(subjectId)) {
        res.status(400).json({ message: 'Choose a valid semester and subject for the upload' });
        return;
    }

    const semester = await getSemestersCollection().findOne({ _id: new ObjectId(semesterId) });
    const subject = semester?.subjects.find((item) => item.id === subjectId);
    if (!semester || !subject) {
        res.status(400).json({ message: 'The selected semester or subject no longer exists' });
        return;
    }

    const requestedTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!requestedTitle || requestedTitle.length > 120 || /[\\/\u0000-\u001f\u007f]/.test(requestedTitle)) {
        res.status(400).json({ message: 'Enter a valid PDF title (up to 120 characters)' });
        return;
    }
    const title = /\.pdf$/i.test(requestedTitle) ? requestedTitle : `${requestedTitle}.pdf`;

    const createdAt = new Date();
    const uploadLogs = getUploadLogsCollection();
    const log = await uploadLogs.insertOne({
        userId,
        rollNumber: user.rollNumber,
        email: user.email,
        ...(user.firstName ? { firstName: user.firstName } : {}),
        semesterId,
        semesterName: semester.name,
        subjectId,
        originalName: title,
        subject: subject.name,
        size: req.file.size,
        status: 'pending',
        createdAt,
    });

    let uploaded;
    try {
        uploaded = await uploadNoteToCloudinary(req.file);
    } catch (error) {
        await uploadLogs.updateOne({ _id: log.insertedId }, { $set: { status: 'failed' } });
        const providerMessage = error instanceof Error ? error.message : 'Unknown Cloudinary error';
        const providerStatus = typeof error === 'object' && error !== null && 'http_code' in error &&
            typeof error.http_code === 'number'
            ? error.http_code
            : undefined;
        console.error('Cloudinary note upload failed:', { providerStatus, providerMessage });
        res.status(502).json({
            message: providerStatus
                ? `Cloudinary upload failed (${providerStatus}): ${providerMessage}`
                : `Cloudinary upload failed: ${providerMessage}`,
        });
        return;
    }

    await uploadLogs.updateOne(
        { _id: log.insertedId },
        { $set: {
            status: 'uploaded',
            url: uploaded.secureUrl,
            publicId: uploaded.publicId,
        } },
    );
    res.status(201).json({
        message: 'Note uploaded successfully',
        file: {
            url: uploaded.secureUrl,
            publicId: uploaded.publicId,
            title,
            size: req.file.size,
            uploadedAt: createdAt,
        },
    });
};