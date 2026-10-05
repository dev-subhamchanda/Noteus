import type { Response } from 'express';
import type { UploadLogDocument } from './database.service.js';

const subscribers = new Set<Response>();

export const subscribeToNoteNotifications = (response: Response): (() => void) => {
    response.status(200);
    response.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    response.write(': connected\n\n');
    subscribers.add(response);

    const keepAlive = setInterval(() => {
        if (!response.destroyed && !response.writableEnded) response.write(': keep-alive\n\n');
    }, 25_000);

    return () => {
        clearInterval(keepAlive);
        subscribers.delete(response);
    };
};

export const publishNoteUploaded = (
    upload: UploadLogDocument & { id: string; publicId: string; uploaderName: string },
): void => {
    const event = `data: ${JSON.stringify({
        id: upload.id,
        name: upload.originalName,
        subject: upload.subject,
        ...(upload.subjectId ? { subjectId: upload.subjectId } : {}),
        ...(upload.semesterId ? { semesterId: upload.semesterId } : {}),
        ...(upload.semesterName ? { semesterName: upload.semesterName } : {}),
        publicId: upload.publicId,
        size: upload.size,
        uploadedAt: upload.createdAt,
        uploadedBy: upload.uploaderName ?? upload.firstName ?? upload.rollNumber,
    })}\n\n`;

    for (const subscriber of subscribers) {
        if (!subscriber.destroyed && !subscriber.writableEnded) subscriber.write(event);
    }
};
