import axios from 'axios';
import process from 'node:process';

const SENDCOREX_URL = 'https://mail.sendcorex.com/v3.0/send';

export const sendPinEmail = async (
    email: string,
    pin: string,
    action: 'created' | 'reset',
): Promise<void> => {
    const apiKey = process.env.SENDCOREX_API_KEY;
    const from = process.env.MAIL_FROM;
    const senderName = process.env.MAIL_SENDER_NAME;

    if (!apiKey || !from || !senderName) {
        throw new Error('SENDCOREX_API_KEY, MAIL_FROM, and MAIL_SENDER_NAME are required');
    }

    const isReset = action === 'reset';
    const subject = isReset ? 'Your new notes app PIN' : 'Your notes app PIN';
    const body = isReset
        ? `<h1>Your new PIN</h1><h2>Your notes app PIN is <strong>${pin}</strong>.</h2><p>Keep it private.</p>`
        : `<h1>Welcome!</h1><h2>Your notes app PIN is <strong>${pin}</strong>.</h2><p>Keep it private.</p>`;

    await axios.post(
        SENDCOREX_URL,
        { to: email, from, senderName, subject, body },
        { headers: { Authorization: apiKey }, timeout: 10_000 },
    );
};