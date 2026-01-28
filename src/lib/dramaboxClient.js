/**
 * ========================================
 * DramaBox API Client (with Signature)
 * ========================================
 * 
 * HTTP client untuk berkomunikasi langsung dengan server
 * resmi DramaBox (sapi.dramaboxdb.com).
 * 
 * Features:
 * - Auto-inject headers (matching real app v5.1.1)
 * - Automatic signature generation (sn header)
 * - Token refresh on 401
 * - Error handling
 * 
 * Headers reverse-engineered from DramaBox v5.1.1 via HTTP Toolkit
 */

import { getCredentials, buildTnHeader, extractUserId } from './credentialsManager.js';
import { generateSignature } from './signatureGenerator.js';

// Base URL untuk DramaBox API
const BASE_URL = 'https://sapi.dramaboxdb.com';

// Cloudflare Worker Proxy URL (set this to bypass IP blocking on Vercel)
// Example: https://dramabox-proxy.your-subdomain.workers.dev
const CF_PROXY_URL = process.env.DRAMABOX_CF_PROXY;

if (CF_PROXY_URL) {
    console.log('[DramaBoxClient] Using Cloudflare Worker proxy:', CF_PROXY_URL);
}

// App configuration (from DramaBox v5.1.1)
const APP_CONFIG = {
    version: '511',           // Version code for v5.1.1
    versionName: '5.1.1',
    packageName: 'com.storymatrix.drama',
    platform: '53',           // Platform code
    channelId: 'DAUAG1050223',
    nchid: 'DRA1000042',
    pline: 'ANDROID',
    storeSource: 'store_google'
};

// Device info (matching emulator)
const DEVICE_INFO = {
    model: 'sdk_gphone64_arm64',
    manufacturer: 'GOOGLE',
    brand: 'google',
    osVersion: '14',
    build: 'Build/UE1A.230829.036.A4',
    screenResolution: '1080x2400',
    deviceScore: '50',
    mcc: '310'
};

/**
 * Supported languages (based on DramaBox app v5.1.1 settings)
 * Maps language code to API language/locale format
 */
const SUPPORTED_LANGUAGES = {
    // Primary languages
    'id': { language: 'id', locale: 'id_ID' },    // Bahasa Indonesia
    'en': { language: 'en', locale: 'en_US' },    // English
    'zh': { language: 'zh', locale: 'zh_CN' },    // 简体中文 (Simplified Chinese)
    'zh-TW': { language: 'zh-Hant', locale: 'zh_TW' }, // 繁体中文 (Traditional Chinese)
    'ja': { language: 'ja', locale: 'ja_JP' },    // 日本語
    'ko': { language: 'ko', locale: 'ko_KR' },    // 한국어
    // Additional languages
    'th': { language: 'th', locale: 'th_TH' },    // ภาษาไทย
    'vi': { language: 'vi', locale: 'vi_VN' },    // Tiếng Việt
    'es': { language: 'es', locale: 'es_ES' },    // Español
    'pt': { language: 'pt', locale: 'pt_BR' },    // Português
    'fr': { language: 'fr', locale: 'fr_FR' },    // Français
    'de': { language: 'de', locale: 'de_DE' },    // Deutsch
    'it': { language: 'it', locale: 'it_IT' },    // Italiano
    'pl': { language: 'pl', locale: 'pl_PL' },    // Polski
    'tr': { language: 'tr', locale: 'tr_TR' },    // Türkçe
    'ar': { language: 'ar', locale: 'ar_SA' }     // العربية
};

/**
 * Build headers for DramaBox API request
 * Headers captured from real DramaBox v5.1.1 via HTTP Toolkit
 * 
 * @param {string} token - Bearer token (JWT)
 * @param {string} deviceId - Device ID (UUID format)
 * @param {string} androidId - Android ID (32 hex chars)
 * @param {string} timestamp - Timestamp in milliseconds
 * @param {string} signature - Generated signature (sn)
 * @param {string} userId - User ID from token
 * @param {string} lang - Language code (id, en, zh, ko)
 */
const buildHeaders = (tnHeader, deviceId, androidId, timestamp, signature, userId = '', lang = 'id') => {
    // Get language config
    const langConfig = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES['id'];
    // Generate instance IDs
    const afid = `${timestamp}-${Math.floor(Math.random() * 10000000000000000)}`;
    const ins = timestamp;
    const instanceId = Buffer.from(`${deviceId}${timestamp}`).toString('hex').substring(0, 32);

    // Calculate active time (seconds since some epoch, simulated)
    const activeTime = Math.floor(Date.now() / 1000) % 1000000;

    // Get local time in required format
    const localTime = new Date().toISOString().replace('T', ' ').replace('Z', ' +0700').substring(0, 23) + ' +0700';

    return {
        // Authentication & Signature
        'tn': tnHeader,  // Already formatted as "Bearer <base64>"
        'sn': signature,

        // App info
        'version': APP_CONFIG.version,
        'vn': APP_CONFIG.versionName,
        'cid': APP_CONFIG.channelId,
        'mchid': APP_CONFIG.channelId,
        'nchid': APP_CONFIG.nchid,
        'package-name': APP_CONFIG.packageName,
        'pline': APP_CONFIG.pline,
        'store-source': APP_CONFIG.storeSource,
        'apn': '2',
        'p': APP_CONFIG.platform,
        'over-flow': 'new-fly',

        // Device info
        'device-id': deviceId,
        'android-id': androidId,
        'md': DEVICE_INFO.model,
        'mf': DEVICE_INFO.manufacturer,
        'brand': DEVICE_INFO.brand,
        'ov': DEVICE_INFO.osVersion,
        'build': DEVICE_INFO.build,
        'srn': DEVICE_INFO.screenResolution,
        'device-score': DEVICE_INFO.deviceScore,
        'mcc': DEVICE_INFO.mcc,
        'mbid': '60000000000',

        // Emulator/Root detection (set to match our emulator)
        'is_emulator': '1',
        'is_root': '1',
        'is_vpn': '1',

        // Session tracking
        'afid': afid,
        'ins': ins,
        'instanceId': instanceId,
        'active-time': activeTime.toString(),
        'userId': userId,

        // Locale - Dynamic based on lang parameter
        'language': langConfig.language,
        'current-language': langConfig.language,
        'locale': langConfig.locale,
        'country-code': 'ID',
        'time-zone': '+0700',
        'tz': '-420',
        'local-time': localTime,
        'lat': '0',

        // Content
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'okhttp/4.10.0',
        'Connection': 'Keep-Alive',
        'Host': 'sapi.dramaboxdb.com'
    };
};

/**
 * Make HTTP request to DramaBox API with signature
 * Auto-retries once with fresh token if error 12 (access denied)
 * 
 * @param {string} endpoint - API endpoint (tanpa base URL)
 * @param {Object} payload - Request body
 * @param {string} method - HTTP method (default: POST)
 * @param {Object} options - Additional options { lang: 'id'|'en'|'zh'|'ko', isRetry: boolean }
 * @returns {Object} Response data
 */
export const apiRequest = async (endpoint, payload = {}, method = 'POST', options = {}) => {
    const { lang = 'id', isRetry = false } = options;

    // Get credentials
    const credentials = await getCredentials();
    const { deviceId, androidId, token, userId } = credentials;

    // Build tnHeader
    const tnHeader = buildTnHeader(token);

    // Prepare request body and timestamp
    const body = method === 'POST' ? JSON.stringify(payload) : '';
    const timestamp = Date.now().toString();

    // Generate signature with tnHeader
    const signature = generateSignature({
        timestamp,
        body,
        deviceId,
        androidId,
        tnHeader
    });

    if (!signature) {
        throw new Error('Failed to generate signature');
    }

    // Build headers with language
    const headers = buildHeaders(tnHeader, deviceId, androidId, timestamp, signature, userId, lang);

    console.log(`[DramaBoxClient] ${method} ${endpoint}`);
    console.log(`[DramaBoxClient] Signature: ${signature.substring(0, 30)}...`);

    try {
        let response;
        let responseText;
        let contentType;

        // Use Cloudflare Worker proxy if configured (bypasses IP blocking on Vercel)
        if (CF_PROXY_URL) {
            console.log('[DramaBoxClient] Routing through Cloudflare proxy...');

            const proxyResponse = await fetch(CF_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint,
                    method,
                    body: payload,
                    headers,
                    timestamp
                })
            });

            const proxyResult = await proxyResponse.json();

            if (!proxyResult.success) {
                throw new Error(proxyResult.error || 'Cloudflare proxy request failed');
            }

            // Proxy returns { success: true, data: {...} }
            return proxyResult.data;
        }

        // Direct request (for local development or when proxy not configured)
        const url = `${BASE_URL}${endpoint}?timestamp=${timestamp}`;
        const fetchOptions = {
            method,
            headers
        };

        if (method === 'POST') {
            fetchOptions.body = body;
        }

        response = await fetch(url, fetchOptions);

        // Check if response is JSON before parsing
        contentType = response.headers.get('content-type');
        responseText = await response.text();

        // If response is not JSON (e.g., HTML error page), throw descriptive error
        if (!contentType?.includes('application/json') && responseText.startsWith('<')) {
            console.error(`[DramaBoxClient] API returned non-JSON response (${response.status}):`, responseText.substring(0, 200));
            throw new Error(`API returned HTML error page (status: ${response.status}). The server may be temporarily unavailable or blocking requests.`);
        }

        // Parse JSON response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[DramaBoxClient] Failed to parse JSON:`, responseText.substring(0, 200));
            throw new Error(`Invalid JSON response from API: ${parseError.message}`);
        }

        // Check for token expired error (status 12 = Access Denied)
        if (data.status === 12 && !isRetry) {
            console.log('[DramaBoxClient] Token expired, refreshing...');

            // Import refreshCredentials dynamically to avoid circular dependency
            const { refreshCredentials } = await import('./credentialsManager.js');
            await refreshCredentials();

            // Retry the request with new credentials
            return apiRequest(endpoint, payload, method, { lang, isRetry: true });
        }

        // Check for other auth errors
        if (data.status === 2 || data.message?.includes('鉴权')) {
            console.error('[DramaBoxClient] Auth error:', data.message);
        }

        return data;
    } catch (error) {
        console.error(`[DramaBoxClient] Error on ${endpoint}:`, error.message);
        throw error;
    }
};

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {string} lang - Language code (optional, default: 'id')
 */
export const get = async (endpoint, lang = 'id') => {
    return apiRequest(endpoint, {}, 'GET', { lang });
};

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Request body
 * @param {string} lang - Language code (optional, default: 'id')
 */
export const post = async (endpoint, payload, lang = 'id') => {
    return apiRequest(endpoint, payload, 'POST', { lang });
};

export default {
    apiRequest,
    get,
    post
};
