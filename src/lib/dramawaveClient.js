/**
 * ========================================
 * DramaWave API Client
 * ========================================
 * 
 * HTTP client for DramaWave API with OAuth signature generation.
 * Base URL: https://api.mydramawave.com
 * 
 * Authentication:
 * - OAuth signature: MD5(oauthSecret + "&" + userOauthSecret)
 * - Format: oauth_signature=<sig>,oauth_token=<token>,ts=<timestamp>
 * 
 * Based on reverse engineering of DramaWave APK.
 */

import axios from 'axios';
import crypto from 'crypto';

// Configuration from reverse engineering
const BASE_URL = 'https://api.mydramawave.com';
const API_PREFIX = '/dm-api';
const OAUTH_SECRET = '8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv';

// Token storage - pre-filled from intercepted traffic
let currentToken = 'uYWX9jzXBoQtbqlt5boRtqAGp3CzsP7b';
let userOauthSecret = ''; // Will be derived from signature

// Captured device info from intercepted traffic
const DEFAULT_DEVICE = {
    deviceId: '4071e87a-08cc-4ee3-9922-0577f83c73b2',
    device: 'android',
    deviceVersion: '34',
    deviceBrand: 'Google',
    deviceModel: 'Pixel 8',
    appVersion: '1.7.01',
    appName: 'com.dramawave.app',
    language: 'id-ID',
    deviceLanguage: 'in-ID',
    country: 'US',
    deviceCountry: 'ID',
    mccCountry: '310',
    timezone: '+7',
    firebaseId: 'ad46c13f312c48b6f079e4d6be97fe72',
    sessionId: 'ca777a9f-ea38-4e2c-b5e2-0bab81aa9e74',
    appsflyerId: '1767787539736-1176566087555237925',
    screenWidth: '411',
    screenHeight: '890',
    networkType: 'wifi',
    adbEnabled: 'true',
    isMainland: 'false',
    xAfEngagement: 'true'
};

/**
 * Generate random device ID
 */
function generateDeviceId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate OAuth signature using MD5
 * Algorithm: MD5(OAUTH_SECRET + "&" + userOauthSecret)
 * Falls back to captured signature if userOauthSecret is not available
 */
function generateSignature() {
    // If we have userOauthSecret, generate dynamically
    if (userOauthSecret) {
        const signString = `${OAUTH_SECRET}&${userOauthSecret}`;
        return crypto.createHash('md5').update(signString).digest('hex');
    }
    // Fallback to captured signature from intercepted traffic
    return '195e2d37f6a0ca16c46e5d116043445c';
}

/**
 * Build Authorization header
 * Format: oauth_signature=<sig>,oauth_token=<token>,ts=<timestamp>
 */
function buildAuthHeader() {
    if (!currentToken) return '';

    const signature = generateSignature();
    const timestamp = Date.now();
    return `oauth_signature=${signature},oauth_token=${currentToken},ts=${timestamp}`;
}

/**
 * Build common request headers
 * Headers captured from intercepted API traffic
 */
function buildHeaders(includeAuth = true) {
    const headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json; charset=UTF-8',
        'Connection': 'Keep-Alive',
        'Host': 'api.mydramawave.com',
        'User-Agent': 'okhttp/4.12.0',
        // Note: Removed 'Transfer-Encoding': 'chunked' - causes HTTP smuggling errors
        // Device headers
        'device-id': DEFAULT_DEVICE.deviceId,
        'device': DEFAULT_DEVICE.device,
        'device-version': DEFAULT_DEVICE.deviceVersion,
        'device-language': DEFAULT_DEVICE.deviceLanguage,
        'device-country': DEFAULT_DEVICE.deviceCountry,
        // App headers  
        'app-version': DEFAULT_DEVICE.appVersion,
        'app-name': DEFAULT_DEVICE.appName,
        'adb-enabled': DEFAULT_DEVICE.adbEnabled,
        // Location headers
        'language': DEFAULT_DEVICE.language,
        'country': DEFAULT_DEVICE.country,
        'mcc-country': DEFAULT_DEVICE.mccCountry,
        'timezone': DEFAULT_DEVICE.timezone,
        'is-mainland': DEFAULT_DEVICE.isMainland,
        // Screen info
        'screen-width': DEFAULT_DEVICE.screenWidth,
        'screen-height': DEFAULT_DEVICE.screenHeight,
        'network-type': DEFAULT_DEVICE.networkType,
        // Tracking headers
        'firebase-id': DEFAULT_DEVICE.firebaseId,
        'session-id': DEFAULT_DEVICE.sessionId,
        'appsflyer-id': DEFAULT_DEVICE.appsflyerId,
        'X-af-engagement': DEFAULT_DEVICE.xAfEngagement
    };

    if (includeAuth && currentToken) {
        headers['Authorization'] = buildAuthHeader();
    }

    return headers;
}

/**
 * Make GET request to DramaWave API
 */
async function get(endpoint, params = {}, options = {}) {
    const { includeAuth = true, usePrefix = true } = options;
    const url = `${BASE_URL}${usePrefix ? API_PREFIX : ''}${endpoint}`;

    console.log(`[DramaWave] GET ${endpoint}`);

    try {
        const response = await axios.get(url, {
            params,
            headers: buildHeaders(includeAuth),
            timeout: 30000
        });
        return response.data;
    } catch (error) {
        console.error(`[DramaWave] GET failed:`, error.message);
        if (error.response) {
            console.error(`[DramaWave] Response:`, error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Make POST request to DramaWave API
 */
async function post(endpoint, data = {}, options = {}) {
    const { includeAuth = true, usePrefix = true } = options;
    const url = `${BASE_URL}${usePrefix ? API_PREFIX : ''}${endpoint}`;

    console.log(`[DramaWave] POST ${endpoint}`);

    try {
        const response = await axios.post(url, data, {
            headers: buildHeaders(includeAuth),
            timeout: 30000
        });
        return response.data;
    } catch (error) {
        console.error(`[DramaWave] POST failed:`, error.message);
        if (error.response) {
            console.error(`[DramaWave] Response:`, error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Perform anonymous login to get OAuth token
 * This is required before making authenticated API calls
 */
async function anonymousLogin() {
    console.log('[DramaWave] Performing anonymous login...');

    try {
        const response = await post('/anonymous/login', {
            device_id: DEFAULT_DEVICE.deviceId,
            device: DEFAULT_DEVICE.device,
            app_version: DEFAULT_DEVICE.appVersion
        }, { includeAuth: false, usePrefix: true });

        // API returns code 200 for success (not 0)
        if ((response.code === 0 || response.code === 200) && response.data) {
            currentToken = response.data.auth_key || response.data.oauth_token || response.data.token || '';
            userOauthSecret = response.data.auth_secret || response.data.oauth_secret || '';
            console.log('[DramaWave] Login successful, token obtained');
            return { success: true, data: response.data };
        }

        console.log('[DramaWave] Login response:', response);
        return { success: false, error: response.msg || 'Unknown error' };
    } catch (error) {
        console.error('[DramaWave] Login failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Set authentication credentials manually
 */
function setCredentials(token, oauthSecret = '') {
    currentToken = token;
    userOauthSecret = oauthSecret;
    console.log('[DramaWave] Credentials set manually');
}

/**
 * Get current credentials
 */
function getCredentials() {
    return {
        token: currentToken,
        oauthSecret: userOauthSecret,
        deviceId: DEFAULT_DEVICE.deviceId
    };
}

/**
 * Update device configuration
 */
function setDeviceConfig(config) {
    Object.assign(DEFAULT_DEVICE, config);
    console.log('[DramaWave] Device config updated');
}

/**
 * Check if client is authenticated
 */
function isAuthenticated() {
    return !!currentToken;
}

export {
    get,
    post,
    anonymousLogin,
    setCredentials,
    getCredentials,
    setDeviceConfig,
    isAuthenticated,
    generateSignature,
    buildAuthHeader,
    BASE_URL,
    API_PREFIX,
    OAUTH_SECRET,
    DEFAULT_DEVICE
};
