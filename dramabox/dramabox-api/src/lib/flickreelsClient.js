/**
 * ========================================
 * FlickReels API Client
 * ========================================
 * 
 * HTTP client for FlickReels API with signature generation.
 * Base URL: https://api.farsunpteltd.com
 * 
 * Authentication:
 * - Sign: MD5 signature of request body
 * - Timestamp: Unix timestamp in seconds
 * - Nonce: Random 32-character string
 * - Token: JWT token from device login
 */

import axios from 'axios';
import crypto from 'crypto';

// Configuration
const BASE_URL = 'https://api.farsunpteltd.com';
const SIGN_SALT = 'nW8GqjbdSYRI';
const VERSION = '2.2.1.1';

// Default device credentials (from intercepted traffic or env vars)
const DEFAULT_DEVICE = {
    main_package_id: parseInt(process.env.FLICKREELS_PACKAGE_ID) || 100,
    device_id: process.env.FLICKREELS_DEVICE_ID || '5936472655611864',
    device_sign: process.env.FLICKREELS_DEVICE_SIGN || 'b4c167151eb9742d37778d613460ccdc542d0c9e42e49e815bb6a0c4c217e37f',
    apps_flyer_uid: process.env.FLICKREELS_APPSFLYER_UID || '1766911071302-3161096974023551356',
    os: 'android',
    device_brand: process.env.FLICKREELS_DEVICE_BRAND || 'Google',
    device_number: process.env.FLICKREELS_DEVICE_NUMBER || '14',
    language_id: process.env.FLICKREELS_LANGUAGE_ID || '6', // Will be overridden by lang param
    countryCode: process.env.FLICKREELS_COUNTRY_CODE || 'ID',
    googleAdId: process.env.FLICKREELS_GOOGLE_AD_ID || '4071e87a-08cc-4ee3-9922-0577f83c73b2'
};

/**
 * Supported languages for FlickReels (based on LanguageUtil.java)
 * Maps language code to FlickReels numeric ID
 */
const SUPPORTED_LANGUAGES = {
    'en': { id: '1', name: 'English', native: 'English' },
    'ja': { id: '2', name: 'Japanese', native: '日本語' },
    'ko': { id: '3', name: 'Korean', native: '한국어' },
    'zh-TW': { id: '4', name: 'Traditional Chinese', native: '繁體中文' },
    'es': { id: '5', name: 'Spanish', native: 'Español' },
    'id': { id: '6', name: 'Indonesian', native: 'Bahasa Indonesia' },
    'th': { id: '7', name: 'Thai', native: 'ภาษาไทย' },
    'de': { id: '8', name: 'German', native: 'Deutsch' },
    'pt': { id: '10', name: 'Portuguese', native: 'português' },
    'fr': { id: '11', name: 'French', native: 'français' },
    'ar': { id: '12', name: 'Arabic', native: 'العربية' }
};

// Token from environment variable or intercepted traffic
let currentToken = process.env.FLICKREELS_TOKEN || '';

/**
 * Generate random nonce string
 */
function generateNonce(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate MD5 signature for request body
 * 
 * Algorithm:
 * 1. Parse JSON to object
 * 2. Remove null, empty strings, and boolean values
 * 3. Sort keys alphabetically
 * 4. Concatenate: key=value&key=value&...
 * 5. Append: signSalt=nW8GqjbdSYRI
 * 6. Return MD5 hash
 */
function generateSign(body) {
    try {
        // Create a copy and remove unwanted values
        const filtered = {};
        for (const [key, value] of Object.entries(body)) {
            if (value === null || value === undefined) continue;
            if (typeof value === 'string' && value === '') continue;
            if (typeof value === 'boolean') continue;
            filtered[key] = value;
        }

        // Sort keys alphabetically
        const sortedKeys = Object.keys(filtered).sort();

        // Build query string
        const parts = [];
        for (const key of sortedKeys) {
            const value = filtered[key];
            if (Array.isArray(value) || typeof value === 'object') {
                parts.push(`${key}=${JSON.stringify(value)}`);
            } else {
                parts.push(`${key}=${value}`);
            }
        }

        // Append salt and generate MD5
        const signString = parts.join('&') + `&signSalt=${SIGN_SALT}`;
        console.log('[FlickReels] Sign string:', signString.substring(0, 100) + '...');

        return crypto.createHash('md5').update(signString).digest('hex');
    } catch (error) {
        console.error('[FlickReels] Sign generation error:', error);
        return '';
    }
}

/**
 * Make authenticated request to FlickReels API
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {string} lang - Language code (default: 'id')
 */
async function request(endpoint, body = {}, lang = 'id') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    // Get language ID from lang code
    const langConfig = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES['id'];
    const languageId = langConfig?.id || '6';

    // Merge device info with request body, applying language
    const requestBody = {
        ...DEFAULT_DEVICE,
        language_id: languageId,
        ...body
    };

    // Generate signature
    const sign = generateSign(requestBody);

    // Build headers
    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept-Encoding': 'gzip',
        'Cache-Control': 'no-cache',
        'Connection': 'Keep-Alive',
        'User-Agent': 'MyUserAgent',
        'Version': VERSION,
        'Sign': sign,
        'Timestamp': timestamp,
        'Nonce': nonce,
        'Token': currentToken || ''
    };

    const url = `${BASE_URL}${endpoint}`;
    console.log(`[FlickReels] POST ${endpoint}`);
    console.log(`[FlickReels] Sign: ${sign.substring(0, 20)}...`);

    try {
        const response = await axios.post(url, requestBody, {
            headers,
            timeout: 30000
        });

        return response.data;
    } catch (error) {
        console.error(`[FlickReels] Request failed:`, error.message);
        if (error.response) {
            console.error(`[FlickReels] Response:`, error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Set authentication token
 */
function setToken(token) {
    currentToken = token;
    console.log('[FlickReels] Token set');
}

/**
 * Get current token
 */
function getToken() {
    return currentToken;
}

/**
 * Update device credentials
 */
function setDeviceCredentials(credentials) {
    Object.assign(DEFAULT_DEVICE, credentials);
    console.log('[FlickReels] Device credentials updated');
}

export {
    request,
    generateSign,
    generateNonce,
    setToken,
    getToken,
    setDeviceCredentials,
    BASE_URL,
    DEFAULT_DEVICE,
    SUPPORTED_LANGUAGES
};
