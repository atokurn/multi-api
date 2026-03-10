/**
 * NetShort API Client
 * 
 * HTTP client for NetShort API with proper headers.
 * Base URL: https://appsecapi.netshort.com
 * API Path Prefix: /prod-app-api
 * 
 * Headers extracted from intercepted traffic:
 * - Authorization: Bearer JWT token
 * - Device-Code: device identifier
 * - os: 1 (Android)
 * - version: app version
 * - canary: v1
 * - content-language: id_ID
 * - timestamp: current ms epoch
 * - encrypt-key: RSA-encrypted AES key (when encrypted)
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { encryptRequest, decryptResponse, generateRsaKeyPair } from './netshortCrypto.js';

dotenv.config();

// Configuration from environment
const BASE_URL = process.env.NETSHORT_BASE_URL || 'https://appsecapi.netshort.com';
const API_PREFIX = '/prod-app-api';
const TOKEN = process.env.NETSHORT_TOKEN || '';
const DEVICE_CODE = process.env.NETSHORT_DEVICE_CODE || '99fd57415ebf63d0';
const APP_VERSION = process.env.NETSHORT_VERSION || '1.7.5';
const CONTENT_LANGUAGE = process.env.NETSHORT_LANGUAGE || 'id_ID';

// RSA key pair for encryption/decryption
// In production, the app uses keys embedded in libEncryptorP.so
// For our proxy, we generate a key pair for self-encryption tests
// and try to send unencrypted requests first
let rsaKeyPair = null;

function getRsaKeyPair() {
    if (!rsaKeyPair) {
        rsaKeyPair = generateRsaKeyPair();
    }
    return rsaKeyPair;
}

// Axios client instance
const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'User-Agent': 'okhttp/4.10.0',
        'Accept-Encoding': 'gzip',
        'Connection': 'Keep-Alive'
    }
});

/**
 * Build request headers matching intercepted traffic
 * @param {boolean} includeEncryption - Whether to include encrypt-key header
 * @param {string} encryptKey - RSA-encrypted AES key value
 * @returns {object} Headers object
 */
function buildHeaders(includeEncryption = false, encryptKey = '') {
    const headers = {
        'Content-Type': 'application/json',
        'os': '1',
        'version': APP_VERSION,
        'canary': 'v1',
        'content-language': CONTENT_LANGUAGE,
        'Device-Code': DEVICE_CODE,
        'timestamp': String(Date.now())
    };

    if (TOKEN) {
        headers['Authorization'] = `Bearer ${TOKEN}`;
    }

    if (includeEncryption && encryptKey) {
        headers['encrypt-key'] = encryptKey;
    }

    return headers;
}

/**
 * Make a POST request to the NetShort API
 * Tries unencrypted first, falls back to encrypted if needed.
 * 
 * @param {string} endpoint - API endpoint path (relative to API_PREFIX)
 * @param {object} body - Request body
 * @param {object} options - Additional axios options
 * @returns {Promise<object>} Response data
 */
export async function post(endpoint, body = {}, options = {}) {
    const url = `${API_PREFIX}${endpoint}`;

    // Strategy 1: Try sending plaintext JSON first
    try {
        const headers = buildHeaders(false);
        console.log(`[NetShort Client] POST ${url}`);

        const response = await client.post(url, body, {
            headers,
            ...options
        });

        const data = response.data;

        // Check if response is encrypted (Base64 blob instead of JSON)
        if (typeof data === 'string' && data.length > 100 && !data.startsWith('{')) {
            console.log('[NetShort Client] Response appears encrypted, checking for encrypt-key header...');
            const responseEncryptKey = response.headers['encrypt-key'];

            if (responseEncryptKey) {
                console.log('[NetShort Client] Encrypted response detected. encrypt-key length:', responseEncryptKey.length);
                // We'd need the server's private key to decrypt this, which we don't have
                // Return raw data with metadata
                return {
                    _encrypted: true,
                    _rawBody: data,
                    _encryptKey: responseEncryptKey,
                    _message: 'Response is encrypted. Decryption requires the app private key.'
                };
            }
        }

        return data;
    } catch (error) {
        // If 4xx error, the server might require encryption
        if (error.response) {
            const status = error.response.status;
            console.log(`[NetShort Client] POST ${url} failed with status ${status}`);

            if (error.response.data) {
                // Check if error response itself is encrypted
                const data = error.response.data;
                const responseEncryptKey = error.response.headers?.['encrypt-key'];

                if (typeof data === 'string' && responseEncryptKey) {
                    return {
                        _encrypted: true,
                        _status: status,
                        _rawBody: data,
                        _encryptKey: responseEncryptKey,
                        _message: 'Error response is encrypted.'
                    };
                }

                return {
                    _error: true,
                    _status: status,
                    _data: data,
                    _message: `API returned ${status}`
                };
            }
        }
        throw error;
    }
}

/**
 * Make a GET request to the NetShort API
 * 
 * @param {string} endpoint - API endpoint path (relative to API_PREFIX)
 * @param {object} params - Query parameters
 * @param {object} options - Additional axios options  
 * @returns {Promise<object>} Response data
 */
export async function get(endpoint, params = {}, options = {}) {
    const url = `${API_PREFIX}${endpoint}`;

    try {
        const headers = buildHeaders(false);
        console.log(`[NetShort Client] GET ${url}`);

        const response = await client.get(url, {
            headers,
            params,
            ...options
        });

        const data = response.data;

        // Handle encrypted response
        if (typeof data === 'string' && data.length > 100 && !data.startsWith('{')) {
            const responseEncryptKey = response.headers['encrypt-key'];
            if (responseEncryptKey) {
                return {
                    _encrypted: true,
                    _rawBody: data,
                    _encryptKey: responseEncryptKey,
                    _message: 'Response is encrypted.'
                };
            }
        }

        return data;
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            console.log(`[NetShort Client] GET ${url} failed with status ${status}`);
            return {
                _error: true,
                _status: status,
                _data: error.response.data,
                _message: `API returned ${status}`
            };
        }
        throw error;
    }
}

/**
 * Make an encrypted POST request
 * Uses our generated RSA key pair to encrypt the request body
 * Note: Server needs to accept our public key, which may not work
 * without proper handshake. This is a best-effort approach.
 * 
 * @param {string} endpoint - API endpoint path
 * @param {object} body - Request body
 * @returns {Promise<object>} Response data (may be encrypted)
 */
export async function encryptedPost(endpoint, body = {}) {
    const url = `${API_PREFIX}${endpoint}`;
    const keyPair = getRsaKeyPair();

    try {
        const { encryptedBody, encryptKey } = encryptRequest(body, keyPair.publicKey);
        const headers = buildHeaders(true, encryptKey);

        console.log(`[NetShort Client] Encrypted POST ${url}`);
        const response = await client.post(url, encryptedBody, {
            headers,
            transformRequest: [(data) => data] // Don't transform the encrypted body
        });

        const data = response.data;
        const responseEncryptKey = response.headers['encrypt-key'];

        // Try to decrypt response if we have the encrypt-key
        if (responseEncryptKey && typeof data === 'string') {
            try {
                const decrypted = decryptResponse(data, responseEncryptKey, keyPair.privateKey);
                return decrypted;
            } catch (decryptErr) {
                console.log('[NetShort Client] Response decryption failed (expected if server uses different key):', decryptErr.message);
                return {
                    _encrypted: true,
                    _rawBody: data,
                    _encryptKey: responseEncryptKey,
                    _message: 'Cannot decrypt response - server uses different RSA key.'
                };
            }
        }

        return data;
    } catch (error) {
        if (error.response) {
            return {
                _error: true,
                _status: error.response.status,
                _data: error.response.data,
                _message: `Encrypted POST failed with ${error.response.status}`
            };
        }
        throw error;
    }
}

// Export configuration for debugging
export const CONFIG = {
    BASE_URL,
    API_PREFIX,
    DEVICE_CODE,
    APP_VERSION,
    CONTENT_LANGUAGE,
    hasToken: !!TOKEN
};
