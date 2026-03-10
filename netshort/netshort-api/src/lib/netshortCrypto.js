/**
 * NetShort Encryption/Decryption Utilities
 * 
 * The NetShort API uses AES-128-CBC for body encryption.
 * The AES key is RSA-encrypted and sent in the 'encrypt-key' header.
 * 
 * Flow:
 *  Request:  Generate AES key → encrypt body → RSA-encrypt AES key → send in header
 *  Response: Server sends RSA-encrypted AES key in header → decrypt AES key → decrypt body
 */

import crypto from 'crypto';

// AES-128-CBC configuration
const AES_ALGORITHM = 'aes-128-cbc';
const AES_KEY_LENGTH = 16; // 128 bits
const AES_IV_LENGTH = 16;

/**
 * Generate a random AES-128 key
 * @returns {Buffer} 16-byte AES key
 */
export function generateAesKey() {
    return crypto.randomBytes(AES_KEY_LENGTH);
}

/**
 * Generate a random IV for AES-CBC
 * @returns {Buffer} 16-byte IV
 */
export function generateIv() {
    return crypto.randomBytes(AES_IV_LENGTH);
}

/**
 * Encrypt data with AES-128-CBC
 * @param {string} plaintext - JSON string to encrypt
 * @param {Buffer} key - 16-byte AES key
 * @param {Buffer} [iv] - 16-byte IV (generated if not provided)
 * @returns {{ ciphertext: string, iv: Buffer }} Base64 ciphertext and IV used
 */
export function aesEncrypt(plaintext, key, iv = null) {
    if (!iv) iv = generateIv();
    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf-8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Prepend IV to ciphertext for transport (common pattern)
    const combined = Buffer.concat([iv, encrypted]);
    return {
        ciphertext: combined.toString('base64'),
        iv: iv
    };
}

/**
 * Decrypt data with AES-128-CBC
 * @param {string} base64Ciphertext - Base64 encoded ciphertext (IV prepended)
 * @param {Buffer} key - 16-byte AES key
 * @returns {string} Decrypted plaintext
 */
export function aesDecrypt(base64Ciphertext, key) {
    const combined = Buffer.from(base64Ciphertext, 'base64');
    // Extract IV from first 16 bytes
    const iv = combined.subarray(0, AES_IV_LENGTH);
    const encrypted = combined.subarray(AES_IV_LENGTH);
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf-8');
}

/**
 * RSA-encrypt the AES key for the 'encrypt-key' header
 * @param {Buffer} aesKey - AES key to encrypt
 * @param {string} publicKeyPem - RSA public key in PEM format
 * @returns {string} Base64 encoded RSA ciphertext
 */
export function rsaEncryptKey(aesKey, publicKeyPem) {
    const encrypted = crypto.publicEncrypt({
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, aesKey);
    return encrypted.toString('base64');
}

/**
 * RSA-decrypt the AES key from the 'encrypt-key' header (requires private key)
 * @param {string} base64EncryptedKey - Base64 RSA-encrypted AES key
 * @param {string} privateKeyPem - RSA private key in PEM format
 * @returns {Buffer} Decrypted AES key
 */
export function rsaDecryptKey(base64EncryptedKey, privateKeyPem) {
    const encrypted = Buffer.from(base64EncryptedKey, 'base64');
    return crypto.privateDecrypt({
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, encrypted);
}

/**
 * Generate an RSA key pair (for testing/development)
 * @returns {{ publicKey: string, privateKey: string }}
 */
export function generateRsaKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

/**
 * Encrypt a request body for the NetShort API
 * @param {object} body - Request body object
 * @param {string} rsaPublicKey - RSA public key PEM
 * @returns {{ encryptedBody: string, encryptKey: string }} Encrypted body and header value
 */
export function encryptRequest(body, rsaPublicKey) {
    const aesKey = generateAesKey();
    const jsonString = JSON.stringify(body);
    const { ciphertext } = aesEncrypt(jsonString, aesKey);
    const encryptKey = rsaEncryptKey(aesKey, rsaPublicKey);
    return {
        encryptedBody: ciphertext,
        encryptKey: encryptKey
    };
}

/**
 * Decrypt a response body from the NetShort API
 * @param {string} encryptedBody - Base64 encrypted response body
 * @param {string} encryptKeyHeader - RSA-encrypted AES key from response header
 * @param {string} rsaPrivateKey - RSA private key PEM
 * @returns {object} Decrypted and parsed JSON response
 */
export function decryptResponse(encryptedBody, encryptKeyHeader, rsaPrivateKey) {
    const aesKey = rsaDecryptKey(encryptKeyHeader, rsaPrivateKey);
    const jsonString = aesDecrypt(encryptedBody, aesKey);
    return JSON.parse(jsonString);
}
