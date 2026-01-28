/**
 * ========================================
 * Token Manager
 * ========================================
 * 
 * Mengelola token autentikasi untuk DramaBox API.
 * 
 * Fitur:
 * - Fetch token dari token source
 * - Cache token ke file (1 jam expiry)
 * - Auto-refresh jika expired
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache file path
const CACHE_FILE = path.resolve(__dirname, '../../tokenCache.json');

// Token sources (fallback list)
const TOKEN_SOURCES = [
    'https://dramabox-token.vercel.app/token',
    'https://dramabox-api.vercel.app/api/token'
];

// Token expiry time (1 hour in milliseconds)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Read cached token from file
 * @returns {Object|null} Cached token or null if not found/expired
 */
const readCache = async () => {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(data);

        // Check if token is still valid (not expired)
        if (Date.now() - parsed.timestamp < TOKEN_EXPIRY_MS) {
            console.log('[TokenManager] Using cached token');
            return parsed;
        }

        console.log('[TokenManager] Cache expired, fetching new token...');
        return null;
    } catch (error) {
        // File doesn't exist or is corrupted
        return null;
    }
};

/**
 * Save token to cache file
 * @param {Object} data - Token data to cache
 */
const saveCache = async (data) => {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[TokenManager] Token cached successfully');
    } catch (error) {
        console.error('[TokenManager] Failed to cache token:', error.message);
    }
};

/**
 * Fetch token from token source
 * @returns {Object} Token data {token, deviceId}
 */
const fetchToken = async () => {
    const errors = [];

    // Try each token source
    for (const source of TOKEN_SOURCES) {
        try {
            console.log(`[TokenManager] Fetching from ${source}...`);

            const response = await fetch(source);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Handle different response formats
            if (data.data?.token) {
                // Format: { data: { token, deviceId } }
                return {
                    token: data.data.token,
                    deviceId: data.data.deviceId || data.data.deviceid
                };
            } else if (data.token) {
                // Format: { token, deviceid }
                return {
                    token: data.token,
                    deviceId: data.deviceid || data.deviceId
                };
            }

            throw new Error('Invalid response format');
        } catch (error) {
            errors.push(`${source}: ${error.message}`);
            continue;
        }
    }

    throw new Error(`Failed to fetch token from all sources: ${errors.join(', ')}`);
};

/**
 * Get token (from cache or fetch new)
 * @returns {Object} Token data {token, deviceId, timestamp}
 */
export const getToken = async () => {
    // 1. Try to get from cache
    const cached = await readCache();
    if (cached) {
        return cached;
    }

    // 2. Fetch new token
    const tokenData = await fetchToken();

    // 3. Add timestamp and save to cache
    const dataWithTimestamp = {
        ...tokenData,
        timestamp: Date.now()
    };
    await saveCache(dataWithTimestamp);

    return dataWithTimestamp;
};

/**
 * Force refresh token (ignore cache)
 * @returns {Object} New token data
 */
export const refreshToken = async () => {
    console.log('[TokenManager] Force refreshing token...');
    const tokenData = await fetchToken();

    const dataWithTimestamp = {
        ...tokenData,
        timestamp: Date.now()
    };
    await saveCache(dataWithTimestamp);

    return dataWithTimestamp;
};

/**
 * Clear token cache
 */
export const clearCache = async () => {
    try {
        await fs.unlink(CACHE_FILE);
        console.log('[TokenManager] Cache cleared');
    } catch (error) {
        // Ignore if file doesn't exist
    }
};

export default {
    getToken,
    refreshToken,
    clearCache
};
