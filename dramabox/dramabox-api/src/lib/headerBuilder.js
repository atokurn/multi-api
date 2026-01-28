/**
 * ========================================
 * Header Builder
 * ========================================
 * 
 * Build headers yang diperlukan untuk request ke DramaBox API.
 * 
 * Headers ini disimulasikan seperti request dari aplikasi
 * DramaBox Android resmi.
 */

import { getToken } from './tokenManager.js';

// App version info (dari APK DramaBox)
const APP_CONFIG = {
    version: '430',           // Version code
    versionName: '4.3.0',    // Version name
    packageName: 'com.storymatrix.drama',
    platform: '43',
    channelId: 'DRA1000042'
};

// Device simulation
const DEVICE_CONFIG = {
    model: 'Redmi Note 8',
    manufacturer: 'XIAOMI',
    brand: 'Xiaomi',
    osVersion: '14'
};

/**
 * Build complete headers for DramaBox API request
 * Headers use lowercase to match official app behavior
 * @returns {Object} Headers object
 */
export const buildHeaders = async () => {
    const { token, deviceId } = await getToken();

    return {
        // Authentication - lowercase 'tn' is critical!
        'tn': `Bearer ${token}`,

        // App info
        'version': APP_CONFIG.version,
        'vn': APP_CONFIG.versionName,
        'cid': APP_CONFIG.channelId,
        'package-name': APP_CONFIG.packageName,
        'apn': '1',
        'p': APP_CONFIG.platform,

        // Device info
        'device-id': deviceId,
        'md': DEVICE_CONFIG.model,
        'mf': DEVICE_CONFIG.manufacturer,
        'brand': DEVICE_CONFIG.brand,
        'ov': DEVICE_CONFIG.osVersion,

        // Locale
        'language': 'in',
        'current-language': 'in',
        'time-zone': '+0700',

        // Content
        'content-type': 'application/json; charset=UTF-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.10.0'
    };
};

/**
 * Build headers with custom token/deviceId
 * @param {string} token - Bearer token
 * @param {string} deviceId - Device ID
 * @returns {Object} Headers object
 */
export const buildHeadersWithToken = (token, deviceId) => {
    return {
        'tn': `Bearer ${token}`,
        'version': APP_CONFIG.version,
        'vn': APP_CONFIG.versionName,
        'cid': APP_CONFIG.channelId,
        'package-name': APP_CONFIG.packageName,
        'apn': '1',
        'p': APP_CONFIG.platform,
        'device-id': deviceId,
        'md': DEVICE_CONFIG.model,
        'mf': DEVICE_CONFIG.manufacturer,
        'brand': DEVICE_CONFIG.brand,
        'ov': DEVICE_CONFIG.osVersion,
        'language': 'in',
        'current-language': 'in',
        'time-zone': '+0700',
        'content-type': 'application/json; charset=UTF-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.10.0'
    };
};

export default {
    buildHeaders,
    buildHeadersWithToken
};
