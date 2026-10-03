import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import process from 'node:process';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? '';
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? '';
const notesFolder = process.env.CLOUDINARY_NOTES_FOLDER?.trim() || 'notes';

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

export interface UploadedNote {
    secureUrl: string;
    publicId: string;
}

export const isCloudinaryConfigured = (): boolean =>
    Boolean(cloudName && apiKey && apiSecret);

export const uploadNoteToCloudinary = (file: Express.Multer.File): Promise<UploadedNote> =>
    new Promise((resolve, reject) => {
        const publicId = `${randomUUID()}.pdf`;
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: notesFolder,
                public_id: publicId,
                resource_type: 'raw',
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!result) {
                    reject(new Error('Cloudinary returned no upload result'));
                    return;
                }

                resolve({
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                });
            },
        );

        uploadStream.end(file.buffer);
    });

export const createNoteAccessUrl = (publicId: string, attachment: boolean): string =>
    cloudinary.utils.private_download_url(publicId, 'pdf', {
        resource_type: 'raw',
        type: 'upload',
        attachment,
        expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
    });