import bcrypt from 'bcryptjs';

export const normalizeAdminUsername = (username: string): string =>
    username.trim().toLowerCase();

export const hashAdminPassword = (password: string): Promise<string> => {
    if (!password) {
        throw new Error('Admin password cannot be empty');
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('ADMIN_PASSWORD must be no longer than 72 bytes');
    }
    return bcrypt.hash(password, 12);
};

export const verifyAdminPassword = async (password: string, passwordHash: string): Promise<boolean> => {
    if (Buffer.byteLength(password, 'utf8') > 72) return false;
    return bcrypt.compare(password, passwordHash);
};
