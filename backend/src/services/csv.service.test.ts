import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from './csv.service.js';

test('CSV parser handles BOM, CRLF, escaped quotes, and quoted commas', () => {
    assert.deepEqual(
        parseCsv('\uFEFFfirstName,lastName,email\r\n"Ada, Jr.","O""Neil",ada@example.com\r\n'),
        [['firstName', 'lastName', 'email'], ['Ada, Jr.', 'O"Neil', 'ada@example.com']],
    );
});

test('CSV parser rejects malformed quoted fields', () => {
    assert.throws(() => parseCsv('firstName,email\n"Ada,ada@example.com'), /unclosed quoted value/);
    assert.throws(() => parseCsv('firstName,email\nAda"x,ada@example.com'), /invalid position/);
});
