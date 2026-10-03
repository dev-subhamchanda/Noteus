import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    hashAdminPassword,
    normalizeAdminUsername,
    verifyAdminPassword,
} from './admin-auth.service.js';

test('admin usernames are normalized consistently', () => {
    assert.equal(normalizeAdminUsername('  Admin.User  '), 'admin.user');
});

test('admin passwords are stored as verifiable bcrypt hashes', async () => {
    const password = 'test-admin-password';
    const passwordHash = await hashAdminPassword(password);

    assert.notEqual(passwordHash, password);
    assert.match(passwordHash, /^\$2[aby]\$/);
    assert.equal(await verifyAdminPassword(password, passwordHash), true);
    assert.equal(await verifyAdminPassword('incorrect-password', passwordHash), false);
});

test('admin passwords over bcrypt byte limit are rejected', async () => {
    assert.throws(() => hashAdminPassword('a'.repeat(73)), /72 bytes/);
    assert.equal(await verifyAdminPassword('a'.repeat(73), 'unused'), false);
});
