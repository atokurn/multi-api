/**
 * ShortMax Video Segment Decryption
 * 
 * Based on sapimu.au reference:
 * - Method: AES-128-CBC
 * - IV: shortmax00000000 (fixed)
 * - Key: Embedded in each .ts file (extracted from header)
 * 
 * Header format:
 * - First 24 bytes: header text starting with "shortmax"
 * - Bytes 16-20: keyOffset (4 bytes, big-endian)
 * - Bytes 20-24: dataOffset (4 bytes, big-endian)
 * - Key: 16 bytes at keyOffset
 * - Encrypted data: 1024 bytes at offset 1024 (first chunk only)
 */

import crypto from 'crypto';

const FIXED_IV = 'shortmax00000000'; // 16 bytes

/**
 * Parse header to extract key offset and data offset
 */
function parseHeader(headerBytes) {
    const header = new TextDecoder().decode(headerBytes);
    if (!header.startsWith('shortmax')) {
        return null;
    }

    const keyOffset = parseInt(header.slice(16, 20));
    const dataOffset = parseInt(header.slice(20, 24));

    return { keyOffset, dataOffset };
}

/**
 * Decrypt ShortMax .ts segment
 * @param {ArrayBuffer} arrayBuffer - The encrypted .ts file content
 * @returns {ArrayBuffer} - Decrypted .ts file content
 */
export async function decryptTs(arrayBuffer) {
    const buf = new Uint8Array(arrayBuffer);
    const header = new TextDecoder().decode(buf.slice(0, 24));

    // Check if this is a ShortMax encrypted segment
    if (!header.startsWith('shortmax')) {
        return arrayBuffer; // Not encrypted, return as-is
    }

    // Parse offsets from header
    const keyOffset = parseInt(header.slice(16, 20));
    const dataOffset = parseInt(header.slice(20, 24));

    // Extract 16-byte AES key from buffer
    const key = buf.slice(keyOffset, keyOffset + 16);
    const iv = new TextEncoder().encode(FIXED_IV);

    // First 1024 bytes of encrypted data (starting at offset 1024)
    const encData = buf.slice(1024, dataOffset + 1024);

    // Decrypt using AES-128-CBC
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
    );

    const dec = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        encData
    );

    // Reconstruct the .ts file:
    // - Decrypted portion at start
    // - Rest of file after dataOffset + 1024
    const result = new Uint8Array(dec.byteLength + (buf.length - dataOffset - 1024));
    result.set(new Uint8Array(dec), 0);
    result.set(buf.slice(dataOffset + 1024), dec.byteLength);

    return result.buffer;
}

/**
 * Node.js version of decryption (for server-side use)
 */
export function decryptTsNode(buffer) {
    const buf = Buffer.from(buffer);
    const header = buf.slice(0, 24).toString('utf8');

    // Check if this is a ShortMax encrypted segment
    if (!header.startsWith('shortmax')) {
        return buffer; // Not encrypted, return as-is
    }

    // Parse offsets from header
    const keyOffset = parseInt(header.slice(16, 20));
    const dataOffset = parseInt(header.slice(20, 24));

    // Extract 16-byte AES key
    const key = buf.slice(keyOffset, keyOffset + 16);
    const iv = Buffer.from(FIXED_IV, 'utf8');

    // Encrypted data starts at offset 1024
    const encData = buf.slice(1024, dataOffset + 1024);

    // Decrypt using AES-128-CBC
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const dec = Buffer.concat([decipher.update(encData), decipher.final()]);

    // Reconstruct: decrypted + rest of file
    const rest = buf.slice(dataOffset + 1024);
    return Buffer.concat([dec, rest]);
}

export default {
    decryptTs,
    decryptTsNode,
    FIXED_IV
};
