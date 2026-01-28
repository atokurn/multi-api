/**
 * ShortMax HTTP Client
 * Handles API requests with proper headers and encryption
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decryptJson } from './shortmaxCrypto.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import crypto from 'crypto';

const RC4_EVENT_KEY = 'XBUAU2eC0gF6VbgJuZx5ipXCFUoN79w0';
const RSA_PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQN8wJEvdcpklku3uwxLaz67OtP3GpAK2AHUY/+PWvijPVKBSRCXD6wir+JKJQ7zcx7sEnAxUi/CMzwRn+BmKomIvQpzIUzLuaAxiu5RM0BAkKWXAxKScsj8nY3vlbChOdw4ICxqrSO3QZMeDxzyNLXKnXm7OFBB/w5xli5zUhDQIDAQAB';

let cachedIp = null;

async function getClientIp() {
    if (cachedIp) return cachedIp;
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        cachedIp = response.data.ip;
        return cachedIp;
    } catch (e) {
        console.warn('Failed to get client IP:', e.message);
        return '127.0.0.1'; // Fallback
    }
}

function rsaEncrypt(data) {
    try {
        const buffer = Buffer.from(data, 'utf-8');
        const encrypted = crypto.publicEncrypt({
            key: `-----BEGIN PUBLIC KEY-----\n${RSA_PUBLIC_KEY}\n-----END PUBLIC KEY-----`,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, buffer);
        return encrypted.toString('base64');
    } catch (e) {
        console.error('RSA Encrypt Failed:', e.message);
        return null;
    }
}

// Base URLs
export const BASE_URLS = {
    primary: 'https://api.shorttv.live',
    alternate: 'https://api.shorttv.app'
};

// Default headers based on intercept analysis
const DEFAULT_HEADERS = {
    'User-Agent': 'okhttp/4.12.0',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'clientPlatform': 'android',
    'channel': 'google_play',
    'environment': 'prod',
    'language': 'id',
    'locale': 'id_ID',
    'timeZone': 'Asia/Jakarta',
    'androidVersion': '2.14.0',
    'buildValue': '2924',
    'systemVersion': '14',
    'model': 'sdk_gphone64_arm64',
    'resolution': '1080x2337',
    'afVersion': '1',
    'hasProxy': 'false',
    'vefCode': '015'
};

// Device identifiers (can be overridden via env)
export const DEVICE_CONFIG = {
    deviceId: process.env.SHORTMAX_DEVICE_ID || 'f480d31fe5d3b268e514de7c06c5d3c8',
    gaid: process.env.SHORTMAX_GAID || '4071e87a-08cc-4ee3-9922-0577f83c73b2',
    rc4Key: process.env.SHORTMAX_RC4_KEY || 'paAdjFFM3B6pVUiNrgpyflz3jXI5nR7P' // Added for generateTraceParam
};

/**
 * Get proxy agent based on SHORTMAX_PROXY env var
 * Supports: socks5://host:port, http://host:port, https://host:port
 */
function getProxyAgent() {
    const proxyUrl = process.env.SHORTMAX_PROXY;
    if (!proxyUrl) return null;

    if (proxyUrl.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    } else {
        return new HttpsProxyAgent(proxyUrl);
    }
}

/**
 * Create axios instance with ShortMax configuration
 */
const proxyAgent = getProxyAgent();
const client = axios.create({
    baseURL: BASE_URLS.primary,
    timeout: 30000,
    headers: DEFAULT_HEADERS,
    ...(proxyAgent && {
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent
    })
});




/**
 * Generate TraceParam for API request signature
 * @param {object} data - Request body parameters
 * @param {string} endpoint - API endpoint URL path (for double encryption check)
 * @returns {string} - TraceParam string
 */
function generateTraceParam(data, endpoint) {
    // 1. Concatenate values in strict order
    // The app's TraceParam generation uses specific parameter orders for different endpoints.
    // For simplicity and to match the provided snippet, we'll use Object.values()
    // and assume the `data` object is already ordered or that the order doesn't strictly matter
    // for the MD5 hash input, which is often the case if the app uses a fixed order.
    // If a specific `paramOrder` is needed, it should be passed and used here.
    const params = Object.values(data).map(String);

    // 2. Append androidVersion
    const androidVersion = DEFAULT_HEADERS.androidVersion;
    const paramString = params.join('') + androidVersion;

    // 3. MD5 Hash (lowercase hex)
    const md5Hash = crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();

    // 4. RC4 Encrypt with Session Key
    let finalTraceParam = encrypt(md5Hash, DEVICE_CONFIG.rc4Key).toLowerCase(); // Using `encrypt` from shortmaxCrypto.js

    // 5. Double Encrypt for Login/Event/Report
    // Logic from ApiInterceptor.kt: if Authorization present OR specific endpoints
    // Actually, in ApiInterceptor.kt, it checks:
    // IF appEventReportV1 -> double encrypt
    // IF initLogin/tripartiteLogin/loginMobile -> double encrypt

    // We can check endpoint or just always double encrypt if we are simulating logic
    const doubleEncryptEndpoints = [
        '/app/eventController/appEventReportV1',
        '/app/login/v4/initLogin',
        '/app/login/v3/tripartiteLogin',
        '/app/login/loginMobile'
    ];

    if (doubleEncryptEndpoints.includes(endpoint)) {
        finalTraceParam = encrypt(finalTraceParam, RC4_EVENT_KEY).toLowerCase(); // Using `encrypt` from shortmaxCrypto.js
    }

    return finalTraceParam;
}


/**
 * Generate request headers
 * @param {boolean} isEncrypted - Whether the endpoint requires encryption
 * @param {string} endpoint - API endpoint URL path
 * @param {object} bodyData - Request body data (for TraceParam)
 * @returns {object} - Headers object
 */
export async function getHeaders(isEncrypted = true, endpoint = '', bodyData = {}) {
    const headers = {
        ...DEFAULT_HEADERS,
        'deviceId': DEVICE_CONFIG.deviceId,
        'gaid': DEVICE_CONFIG.gaid,
        'session_id': uuidv4(),
        'isEncrypt': isEncrypted ? 'true' : 'false'
    };

    // TraceParam Logic (Only for specific endpoints)
    // Check if endpoint ends with any of the allowed paths
    // (endpoints might be passed with leading slash)
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`; // Ensure leading slash for comparison

    if (Object.keys(bodyData).length > 0) {
        const traceParamEndpoints = [
            '/app/eventController/appEventReportV1',
            '/app/login/v4/initLogin',
            '/app/login/v3/tripartiteLogin',
            '/app/login/loginMobile'
        ];

        if (traceParamEndpoints.includes(normalizedEndpoint) && isEncrypted) {
            headers['TraceParam'] = generateTraceParam(bodyData, normalizedEndpoint);
        }
    }

    // CI Header (Client IP Encrypted)
    // Only if authorized? ApiInterceptor says "if strA != null".
    // strA comes from AccountRepo.Z() which is likely populated after login OR config.
    // Add Authorization token if available (required for content endpoints)
    const token = process.env.SHORTMAX_TOKEN || '1pkeeporqzC4ou7Jk1fWnuZOfTmmPzFXbRKqbYUFKCbaHJFVMkjd0nlWvoPxQjUXOP3tkiCXSNnXb6JYwd05IX3woU+Nz+Q8PAYMA8YSwEpCPc8+Tdtzrwg3y8jl6M74M2MuOiwn6/vBYuRD9WBy769eeATCsICVRy0wXMSfoXCIVi/TXaFsc8aNnZTyeZOm45Uce0YOWq/tQsm9yB211fnA8p/OmdK+cXHIkQhiILhAB3RWXC8sROLopaUHeesL44z4dL/elVOAGYKCj0K9sOKyJ4715wCO2MjP3CkjgUntaXN37wfYz3wWdP8dhh+Ua6RCFzIO6Se8Ef9lwiAFwBq9JErS8mBJi5KJIuzZLXJlXsWtoFhTKnTfIs57sHoAgHWSQPahJDDDxLEJdtKdBxGgN7TNqSr0P5akMJbnFdkhhOrpNXChk9OPjoCV0wivL7qdwUJlTbYje09YXKDhPuHWY1Cpox116AQ7/y6c8X268z893/7BiyfZZC1P6gvcJTMMF3lSfqpQPLsAc61YkLPYG/U5iPqp0l/BWf4AOTa4f5p6WX3vwMj4rStRdorAtQ9bJYNqX0GODoXno/N1JgkLSXI++5ZPWgxrIQg6IpODWPI97F94Kd8z02kL/QSjOtLI068GwY8ZHRdUrnnwmj1UiANr2bMs0NACqSZLIzHtiIUjKg/dMFV/9srjf1YiwEZdoled2yVwc1H7jnuDltV9sqsJlotfWns2sBSnw7elwLRy28eLEF/ziWh0oRc8zCKV/LNC9tDQYpgRJqi/RxcovPgtUh4/Cb3l2OWJtTjXjO2qrdjtvQ2R6s7E4hV7UrlUZtG+8qhUb5uwiiquUzz3a0ih01UkgamC6MFe6mJAU2Z4LYo9ipdLBO64wSX53HpEINzj0V+5af++EeHhnDIJi92qjzCApXt5PgudKmyPvXusKR5reXEHgKdJte2ElxhqHlXfljQcbmtZN3u17YOsC4sKcdcLLNnHiSxoiEjeNJRErRjPPKSpC8tdL6xxkhynhUHqOAetlhF27SWhKHvuAu0GaiDy1mPy8cK2n0sOg8YcXSf9bTtZAfoLyf1X84aCWdAg8/cCsOzSi/ZBAJtI86P6PNKyuZgo99xiKr11NU07pGRzNqIVwk6nJUzxGxebjvOLYtW600NucQ+0zQ==';
    if (token) {
        const ip = await getClientIp();
        const ci = rsaEncrypt(ip);
        if (ci) {
            headers['ci'] = ci;
        }
    }
    if (token) {
        headers['Authorization'] = token;
    }

    return headers;
}

/**
 * Make an encrypted POST request
 * @param {string} endpoint - API endpoint
 * @param {object} body - Request body data
 * @returns {Promise<object>} - Decrypted response data
 */
export async function encryptedPost(endpoint, body = {}) {
    // Encrypt request body
    // Ensure data keys are ordered for JSON stringify to match TraceParam logic if implied
    // (Though TraceParam depends on VALUES, having consistent JSON is safer)
    const jsonBody = JSON.stringify(body);
    // App sends lowercase hex for body
    const encryptedBody = encrypt(jsonBody).toLowerCase();

    const headers = await getHeaders(true, endpoint, body);
    headers['Content-Type'] = 'application/json;charset=utf-8';

    try {
        const response = await client.post(endpoint, encryptedBody, { headers });
        // console.log(`[ShortMax Client] Full response from ${endpoint}:`, JSON.stringify(response.data));

        // Check if response needs decryption
        if (response.data && response.data.result) {
            // Response is encrypted, decrypt it
            const decrypted = decryptJson(response.data.result);
            // console.log(`[ShortMax Client] Decrypted response from ${endpoint}:`, JSON.stringify(decrypted).slice(0, 500));
            return decrypted;
        }

        return response.data;
    } catch (error) {
        // console.error(`ShortMax API Error [${endpoint}]:`, error.message);
        throw error;
    }
}

/**
 * Make an unencrypted POST request
 * @param {string} endpoint - API endpoint
 * @param {object} body - Request body data
 * @returns {Promise<object>} - Response data
 */
export async function post(endpoint, body = {}) {
    const headers = await getHeaders(false, endpoint, body); // Unencrypted, no TraceParam usually
    headers['isEncrypt'] = 'false'; // Explicitly set false

    try {
        const response = await client.post(endpoint, body, { headers });
        return response.data;
    } catch (error) {
        console.error(`POST ${endpoint} Error:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Make an encrypted GET-style request (POST with empty body)
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters as body
 * @returns {Promise<object>} - Decrypted response data
 */
export async function encryptedGet(endpoint, params = {}) {
    // Encrypted GETs usually have no body or simple body?
    // If paramOrder applies, we should handle it.
    // For now, pass params as data.
    return encryptedPost(endpoint, params);
}

/**
 * Get server time (unencrypted endpoint for testing)
 * @returns {Promise<object>} - Server time response
 */
export async function getServerTime() {
    return post('/app/correction/time', {});
}

export { client };
