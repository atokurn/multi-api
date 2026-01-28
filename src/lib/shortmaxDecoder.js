import crypto from 'crypto';

/**
 * Decrypt ShortMax TS Video Buffer
 * Based on custom AES-128-CBC logic with header info.
 * @param {Buffer} buffer - Encrypted .ts file buffer
 * @returns {Buffer} - Decrypted .ts file buffer
 */
export function decryptTsBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error('Input must be a Buffer');
    }

    // 1. Read Header (First 24 bytes)
    const headerParams = buffer.subarray(0, 24).toString('utf8');

    // Check prefix
    if (!headerParams.startsWith('shortmax')) {
        // Not encrypted or standard TS
        return buffer;
    }

    try {
        // 2. Extract Offsets
        const keyOffset = parseInt(headerParams.slice(16, 20), 10);
        const dataOffset = parseInt(headerParams.slice(20, 24), 10);

        if (isNaN(keyOffset) || isNaN(dataOffset)) {
            console.warn('[ShortMaxDecoder] Invalid offsets in header');
            return buffer;
        }

        // 3. Extract Key (16 bytes starting at keyOffset)
        // Ensure bounds
        if (buffer.length < keyOffset + 16) {
            console.warn('[ShortMaxDecoder] Buffer too short for key');
            return buffer;
        }
        const key = buffer.subarray(keyOffset, keyOffset + 16);

        // 4. Define IV
        // Fixed IV from user's screenshot
        const iv = Buffer.from('shortmax00000000', 'utf8');

        // 5. Extract Encrypted Data chunk
        // Logic: encData = buf.slice(1024, dataOffset + 1024);
        // This implies the encrypted chunk is of length `dataOffset`.
        const encryptStart = 1024;
        const encryptEnd = 1024 + dataOffset;

        if (buffer.length < encryptEnd) {
            console.warn('[ShortMaxDecoder] Buffer too short for encrypted data chunk');
            return buffer; // Or fail?
        }

        const encryptedData = buffer.subarray(encryptStart, encryptEnd);

        // 6. Decrypt
        // 'AES-CBC', iv.
        // Node's createDecipheriv('aes-128-cbc', key, iv)
        // Note: The screenshot uses (await crypto.subtle.decrypt...).
        // Web Crypto AES-CBC usually expects PKCS7 padding unless configured otherwise.
        // However, this seems to be decrypting a partial chunk of the file, so it might be
        // standard block aligned. If dataOffset is multiple of 16, good.
        // If not, we might need setAutoPadding(false).
        // Let's assume standard first. If it fails, we catch error.

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false); // TS segments are often streams, better safe.
        // Also original code: new Uint8Array(dec.byteLength + ...) imply `dec` size is specific.

        const decryptedChunk = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        // 7. Reassemble
        // Result = DecryptedChunk + Remainder(from encryptEnd to EOF)
        // Original: result.set(dec, 0); result.set(remainder, dec.len);
        // Wait, the original header (1024 bytes) is DISCARDED.
        // Result starts with decrypted chunk.

        const remainder = buffer.subarray(encryptEnd);
        const result = Buffer.concat([decryptedChunk, remainder]);

        return result;

    } catch (error) {
        console.error('[ShortMaxDecoder] Decryption failed:', error.message);
        return buffer; // Return original or throw? Returning original allows playback failure which is better than crash.
    }
}
