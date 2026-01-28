/**
 * ShortMax TraceParam Signature Generator
 * 
 * Algorithm (from decompiled o.java lines 211-217):
 * 1. Get eventList + localTimeLong from request body
 * 2. Compute: hash = MD5(eventList + localTimeLong + androidVersion)
 * 3. If Authorization header exists:
 *    hash = RC4_encrypt(hash, ApiRc4Key)  // ze.b.c() - dynamic per device
 * 4. TraceParam = RC4_encrypt(hash, EventRc4Key)  // ze.b.e() = QZqOsM72SoEXv2RIvRaUGsMIjELfx2bc
 * 5. Result is hex-encoded
 */

import crypto from 'crypto';

// Event RC4 Key (from ze/b.java line 51: method a())
// Decoded from: [81, 90, 113, 79, 115, 77, 55, 50, 83, 111, 69, 88, 118, 50, 82, 73, 118, 82, 97, 85, 71, 115, 77, 73, 106, 69, 76, 102, 120, 50, 98, 99]
export const EVENT_RC4_KEY = 'QZqOsM72SoEXv2RIvRaUGsMIjELfx2bc';

// API RC4 Key (from ze/b.java line 89-106: method c())
// Extracted via Frida: XBUAU2eC0gF6VbgJuZx5ipXCFUoN79w0
// This is the SAME as the response encryption key!
export const API_RC4_KEY = 'XBUAU2eC0gF6VbgJuZx5ipXCFUoN79w0';

/**
 * RC4 cipher implementation (from ze/d.java)
 */
function rc4(data, key) {
    // Key scheduling algorithm (KSA)
    const keyBytes = Buffer.from(key, 'utf8');
    const S = new Array(256);

    for (let i = 0; i < 256; i++) {
        S[i] = i;
    }

    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xFF;
        [S[i], S[j]] = [S[j], S[i]];
    }

    // Pseudo-random generation algorithm (PRGA)
    const result = Buffer.alloc(data.length);
    let i = 0;
    j = 0;

    for (let k = 0; k < data.length; k++) {
        i = (i + 1) & 0xFF;
        const temp = S[i];
        j = (j + temp) & 0xFF;
        S[i] = S[j];
        S[j] = temp;
        result[k] = data[k] ^ S[(S[i] + temp) & 0xFF];
    }

    return result;
}

/**
 * RC4 encrypt string and return hex (ze.d.d)
 */
export function rc4EncryptToHex(plaintext, key) {
    const data = Buffer.from(plaintext, 'utf8');
    const encrypted = rc4(data, key);
    return encrypted.toString('hex');
}

/**
 * RC4 decrypt from hex string (ze.d.c)
 */
export function rc4DecryptFromHex(hexString, key) {
    const data = Buffer.from(hexString, 'hex');
    const decrypted = rc4(data, key);
    return decrypted.toString('utf8');
}

/**
 * MD5 hash (ze.c.a)
 */
export function md5(content) {
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * Generate TraceParam for non-login endpoints
 * 
 * @param {string} eventList - The eventList field from request body
 * @param {string|number} localTimeLong - The localTimeLong field from request body
 * @param {string} androidVersion - Android app version (e.g., "2.14.0")
 * @param {string|null} authToken - Authorization token (if authenticated request)
 * @param {string|null} apiRc4Key - The device's ApiRc4Key (from ze.b.c())
 */
export function generateTraceParam(eventList, localTimeLong, androidVersion, authToken = null, apiRc4Key = null) {
    // Step 1: Concatenate and compute MD5
    const content = `${eventList}${localTimeLong}${androidVersion}`;
    let hash = md5(content);

    // Step 2: If authenticated, encrypt with ApiRc4Key first
    if (authToken && authToken.length > 0 && apiRc4Key && apiRc4Key.length > 0) {
        hash = rc4EncryptToHex(hash, apiRc4Key);
    }

    // Step 3: Encrypt with EventRc4Key
    const traceParam = rc4EncryptToHex(hash, EVENT_RC4_KEY);

    return traceParam;
}

/**
 * Generate TraceParam for login endpoints (initLogin, tripartiteLogin, loginMobile)
 * 
 * @param {object} formData - Form body fields {deviceCode, seq, secretKey, ...}
 * @param {string} androidVersion - Android app version
 */
export function generateLoginTraceParam(formData, androidVersion) {
    // Concatenate all non-empty field values
    let content = '';
    for (const key in formData) {
        const value = formData[key];
        if (value && String(value).length > 0) {
            content += String(value);
        }
    }
    content += androidVersion;

    // MD5 then encrypt with ApiRc4Key (not EventRc4Key for login)
    const hash = md5(content);

    // For login, use ze.b.c() key which we need from device
    // If we don't have it, we can't generate valid login TraceParam
    if (!API_RC4_KEY) {
        console.warn('API_RC4_KEY not set - login TraceParam may be invalid');
    }

    return rc4EncryptToHex(hash, API_RC4_KEY || EVENT_RC4_KEY);
}

/**
 * Set the API RC4 Key (extracted from device)
 */
export function setApiRc4Key(key) {
    API_RC4_KEY = key;
}

export default {
    EVENT_RC4_KEY,
    rc4EncryptToHex,
    rc4DecryptFromHex,
    md5,
    generateTraceParam,
    generateLoginTraceParam,
    setApiRc4Key
};
