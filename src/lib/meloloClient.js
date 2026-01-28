/**
 * ========================================
 * Melolo API Client
 * ========================================
 * 
 * HTTP client for Melolo API (ByteDance/Worldance).
 * Base URL: https://api31-normal-myb.tmtreader.com
 * 
 * Now supports dynamic signature generation using
 * the ByteDance signature algorithm for X-Gorgon, X-Khronos, etc.
 */

import axios from 'axios';
import { generateSecurityHeaders, generateStub } from './bytedanceSignature.js';

// Configuration from intercepted traffic
const BASE_URL = 'https://api31-normal-myb.tmtreader.com';
const APP_ID = '645713';
const APP_NAME = 'Melolo';
const VERSION_CODE = '51020';
const VERSION_NAME = '5.1.0';

// Default device parameters (from intercepted traffic)
const DEFAULT_DEVICE = {
    device_id: process.env.MELOLO_DEVICE_ID || '7591043717768381959',
    iid: process.env.MELOLO_IID || '7591045314401322760',
    ac: 'wifi',
    channel: 'gp',
    aid: APP_ID,
    app_name: APP_NAME,
    version_code: VERSION_CODE,
    version_name: VERSION_NAME,
    device_platform: 'android',
    os: 'android',
    ssmix: 'a',
    device_type: 'sdk_gphone64_arm64',
    device_brand: 'google',
    language: 'id', // Will be overridden by lang param
    os_api: '34',
    os_version: '14',
    manifest_version_code: VERSION_CODE,
    resolution: '1080*2337',
    dpi: '420',
    update_version_code: VERSION_CODE,
    current_region: 'ID',
    carrier_region: 'ID',
    app_language: 'id', // Will be overridden
    sys_language: 'id', // Will be overridden
    app_region: 'ID',
    sys_region: 'ID',
    carrier_region_v2: '510',
    user_language: 'id', // Will be overridden
    time_zone: 'Asia/Jakarta',
    mcc_mnc: '510010'
};

/**
 * Supported languages for Melolo (based on Melolo app settings)
 * Maps frontend lang code to Melolo API format
 */
const SUPPORTED_LANGUAGES = {
    // Languages from Melolo app
    'en': { language: 'en', region: 'US', timezone: 'America/New_York' },    // English
    'id': { language: 'id', region: 'ID', timezone: 'Asia/Jakarta' },        // Indonesian
    'th': { language: 'th', region: 'TH', timezone: 'Asia/Bangkok' },        // Thai
    'pt': { language: 'pt', region: 'BR', timezone: 'America/Sao_Paulo' },   // Portuguese
    'es': { language: 'es', region: 'ES', timezone: 'Europe/Madrid' },       // Spanish
    'vi': { language: 'vi', region: 'VN', timezone: 'Asia/Ho_Chi_Minh' },    // Vietnamese
    'my': { language: 'my', region: 'MM', timezone: 'Asia/Yangon' },         // Burmese
    'km': { language: 'km', region: 'KH', timezone: 'Asia/Phnom_Penh' },     // Khmer
    'ms': { language: 'ms', region: 'MY', timezone: 'Asia/Kuala_Lumpur' },   // Malay
    'ja': { language: 'ja', region: 'JP', timezone: 'Asia/Tokyo' },          // Japanese
    'ko': { language: 'ko', region: 'KR', timezone: 'Asia/Seoul' },          // Korean
    'fr': { language: 'fr', region: 'FR', timezone: 'Europe/Paris' },        // French
    'de': { language: 'de', region: 'DE', timezone: 'Europe/Berlin' },       // German
    'it': { language: 'it', region: 'IT', timezone: 'Europe/Rome' },         // Italian
    // Fallback mappings for codes not directly in Melolo but might be used
    'zh': { language: 'zh', region: 'CN', timezone: 'Asia/Shanghai' },       // Chinese (fallback to English)
    'zh-TW': { language: 'zh', region: 'TW', timezone: 'Asia/Taipei' },      // Traditional Chinese
    'ar': { language: 'ar', region: 'SA', timezone: 'Asia/Riyadh' },         // Arabic (fallback)
    'tr': { language: 'tr', region: 'TR', timezone: 'Europe/Istanbul' },     // Turkish (fallback)
    'pl': { language: 'pl', region: 'PL', timezone: 'Europe/Warsaw' },       // Polish (fallback)
};

// Static security headers (fallback from intercepted traffic)
let staticSecurityHeaders = {
    'X-Argus': process.env.MELOLO_X_ARGUS || '',
    'X-Gorgon': process.env.MELOLO_X_GORGON || '',
    'X-Khronos': process.env.MELOLO_X_KHRONOS || '',
    'X-Ladon': process.env.MELOLO_X_LADON || '',
    'X-SS-DP': APP_ID,
    'X-SS-STUB': process.env.MELOLO_X_SS_STUB || ''
};

// Cookie from intercepted traffic
let cookie = process.env.MELOLO_COOKIE || '';

// Flag to use dynamic signature generation
let useDynamicSignature = true;

/**
 * Set whether to use dynamic signature generation
 */
function setUseDynamicSignature(use) {
    useDynamicSignature = use;
    console.log(`[Melolo] Dynamic signature: ${use ? 'enabled' : 'disabled'}`);
}

/**
 * Update security headers from fresh intercept (fallback)
 */
function setSecurityHeaders(headers) {
    staticSecurityHeaders = {
        ...staticSecurityHeaders,
        ...headers
    };
    console.log('[Melolo] Static security headers updated');
}

/**
 * Set cookie from fresh intercept
 */
function setCookie(newCookie) {
    cookie = newCookie;
    console.log('[Melolo] Cookie updated');
}

/**
 * Build query string from device params with language support
 * @param {Object} params - Additional params
 * @param {string} lang - Language code (default: 'id')
 */
function buildQueryString(params = {}, lang = 'id') {
    // Get language config or default to Indonesian
    const langConfig = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES['id'];

    const allParams = {
        ...DEFAULT_DEVICE,
        // Override language-related params
        language: langConfig.language,
        app_language: langConfig.language,
        sys_language: langConfig.language,
        user_language: langConfig.language,
        app_region: langConfig.region,
        sys_region: langConfig.region,
        current_region: langConfig.region,
        carrier_region: langConfig.region,
        time_zone: langConfig.timezone,
        ...params,
        '_rticket': Date.now().toString()
    };

    return Object.entries(allParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}

/**
 * Get security headers (dynamic or static)
 */
function getSecurityHeaders(queryString, body = null) {
    if (useDynamicSignature) {
        try {
            const dynamicHeaders = generateSecurityHeaders(queryString, body, cookie, {
                aid: parseInt(APP_ID)
            });
            console.log('[Melolo] Using dynamic signature');
            return dynamicHeaders;
        } catch (error) {
            console.warn('[Melolo] Dynamic signature failed, using static:', error.message);
            return staticSecurityHeaders;
        }
    }
    return staticSecurityHeaders;
}

/**
 * Make GET request to Melolo API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Additional query params
 * @param {string} lang - Language code (default: 'id')
 */
async function get(endpoint, params = {}, lang = 'id') {
    const queryString = buildQueryString(params, lang);
    const url = `${BASE_URL}${endpoint}?${queryString}`;

    // Get appropriate security headers
    const secHeaders = getSecurityHeaders(queryString, null);

    const headers = {
        'Accept': 'application/json; charset=utf-8, application/x-protobuf',
        'Accept-Encoding': 'gzip, deflate',
        'Age-Range': '3',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api31-normal-myb.tmtreader.com',
        'passport-sdk-version': '50357',
        'sdk-version': '2',
        'User-Agent': `com.worldance.drama/${VERSION_CODE} (Linux; U; Android 14; en; sdk_gphone64_arm64; Build/UE1A.230829.036.A4; Cronet/TTNetVersion:57545f6e 2025-08-04 QuicVersion:ccae1727 2025-07-24)`,
        'x-vc-bdturing-sdk-version': '2.2.1.i18n',
        'X-Xs-From-Web': 'false',
        ...secHeaders,
        ...(cookie ? { 'Cookie': cookie } : {})
    };

    console.log(`[Melolo] GET ${endpoint}`);

    try {
        const response = await axios.get(url, {
            headers,
            timeout: 30000
        });

        return response.data;
    } catch (error) {
        console.error(`[Melolo] GET request failed:`, error.message);
        if (error.response) {
            console.error(`[Melolo] Response:`, error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Make POST request to Melolo API
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {Object} params - Additional query params
 * @param {string} lang - Language code (default: 'id')
 */
async function post(endpoint, body = {}, params = {}, lang = 'id') {
    const queryString = buildQueryString(params, lang);
    const url = `${BASE_URL}${endpoint}?${queryString}`;

    // Get appropriate security headers with body
    const secHeaders = getSecurityHeaders(queryString, body);

    const headers = {
        'Accept': 'application/json; charset=utf-8, application/x-protobuf',
        'Accept-Encoding': 'gzip, deflate',
        'Age-Range': '3',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api31-normal-myb.tmtreader.com',
        'passport-sdk-version': '50357',
        'sdk-version': '2',
        'User-Agent': `com.worldance.drama/${VERSION_CODE} (Linux; U; Android 14; en; sdk_gphone64_arm64; Build/UE1A.230829.036.A4; Cronet/TTNetVersion:57545f6e 2025-08-04 QuicVersion:ccae1727 2025-07-24)`,
        'x-vc-bdturing-sdk-version': '2.2.1.i18n',
        'X-Xs-From-Web': 'false',
        ...secHeaders,
        ...(cookie ? { 'Cookie': cookie } : {})
    };

    console.log(`[Melolo] POST ${endpoint}`);

    try {
        const response = await axios.post(url, body, {
            headers,
            timeout: 30000
        });

        return response.data;
    } catch (error) {
        console.error(`[Melolo] POST request failed:`, error.message);
        if (error.response) {
            console.error(`[Melolo] Response:`, error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Decode base64 encoded URL (for video URLs in video_model)
 */
function decodeBase64Url(base64Url) {
    try {
        return Buffer.from(base64Url, 'base64').toString('utf-8');
    } catch (error) {
        console.error('[Melolo] Base64 decode error:', error.message);
        return null;
    }
}

export {
    get,
    post,
    setSecurityHeaders,
    setCookie,
    setUseDynamicSignature,
    decodeBase64Url,
    buildQueryString,
    BASE_URL,
    DEFAULT_DEVICE,
    APP_ID,
    VERSION_CODE,
    VERSION_NAME,
    SUPPORTED_LANGUAGES
};

