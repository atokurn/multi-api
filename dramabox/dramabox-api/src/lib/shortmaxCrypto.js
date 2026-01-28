/**
 * ShortMax RC4 Encryption/Decryption
 * Extracted key from MMKV storage
 */

// Extracted from ShortMax app (dynamically generated per session in real app)
// This key must match the one registered with the server via initLogin
const RC4_KEY = process.env.SHORTMAX_RC4_KEY || '9n72I9zfdXmyV7j86AABPBsTTiMvgduT';
export const RC4_EVENT_KEY = 'QZqOsM72SoEXv2RIvRaUGsMIjELfx2bc';

/**
 * RC4 cipher implementation
 * @param {Buffer} data - Data to encrypt/decrypt
 * @param {string} key - RC4 key
 * @returns {Buffer} - Processed data
 */
function rc4Cipher(data, key) {
    const keyBytes = Buffer.from(key, 'utf-8');
    const S = new Array(256);

    // Key-scheduling algorithm (KSA)
    for (let i = 0; i < 256; i++) {
        S[i] = i;
    }

    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + keyBytes[i % keyBytes.length]) & 255;
        [S[i], S[j]] = [S[j], S[i]];
    }

    // Pseudo-random generation algorithm (PRGA)
    const result = Buffer.alloc(data.length);
    let ii = 0;
    j = 0;

    for (let k = 0; k < data.length; k++) {
        ii = (ii + 1) & 255;
        j = (j + S[ii]) & 255;
        [S[ii], S[j]] = [S[j], S[ii]];
        result[k] = data[k] ^ S[(S[ii] + S[j]) & 255];
    }

    return result;
}

/**
 * Encrypt data for API request
 * @param {string} jsonString - JSON string to encrypt
 * @param {string} key - RC4 key (optional, defaults to API key)
 * @returns {string} - Hex-encoded encrypted string
 */
export function encrypt(jsonString, key = RC4_KEY) {
    const data = Buffer.from(jsonString, 'utf-8');
    const encrypted = rc4Cipher(data, key);
    return encrypted.toString('hex').toUpperCase();
}

/**
 * Decrypt API response
 * @param {string} hexString - Hex-encoded encrypted string
 * @param {string} key - RC4 key (optional, defaults to API key)
 * @returns {string} - Decrypted JSON string
 */
export function decrypt(hexString, key = RC4_KEY) {
    const data = Buffer.from(hexString, 'hex');
    const decrypted = rc4Cipher(data, key);
    return decrypted.toString('utf-8');
}

/**
 * Decrypt and parse JSON response
 * @param {string} hexString - Hex-encoded encrypted response
 * @param {string} key - RC4 key (optional)
 * @returns {object} - Parsed JSON object
 */
export function decryptJson(hexString, key = RC4_KEY) {
    try {
        const jsonString = decrypt(hexString, key);
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Failed to decrypt/parse response: ${error.message}`);
    }
}

export { rc4Cipher };
