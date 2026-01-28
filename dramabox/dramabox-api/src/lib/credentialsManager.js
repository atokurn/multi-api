/**
 * ========================================
 * Credentials Manager for DramaBox API
 * ========================================
 * 
 * Manages device credentials for API authentication.
 * Features:
 * - Auto-fetch fresh tokens from external service
 * - Token caching with TTL
 * - Automatic refresh when expired
 */

import crypto from 'crypto';

// Token service URL
const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || 'https://dramabox-token.vercel.app/token';

// Token cache TTL (4 hours - tokens usually expire after several hours)
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

// In-memory cache for credentials
let cachedCredentials = null;
let cacheTimestamp = 0;

/**
 * Fetch fresh token from external token service
 * The service returns: { token, deviceid, androidid }
 */
export const fetchFreshToken = async () => {
    console.log('[CredentialsManager] Fetching fresh token from service...');

    try {
        const response = await fetch(TOKEN_SERVICE_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`Token service returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.token || !data.deviceid || !data.androidid) {
            throw new Error('Invalid token response');
        }

        // Decode the Base64 token to get raw JWT
        const rawToken = Buffer.from(data.token, 'base64').toString('utf-8');

        // Extract userId from JWT
        const userId = extractUserId(rawToken);

        const credentials = {
            deviceId: data.deviceid,
            androidId: data.androidid,
            token: rawToken,
            userId: userId,
            afid: `${Date.now()}-${Math.floor(Math.random() * 10000000000000000)}`,
            ins: Date.now().toString(),
            instanceId: data.deviceid.replace(/-/g, ''),
            fetchedAt: Date.now()
        };

        // Update cache
        cachedCredentials = credentials;
        cacheTimestamp = Date.now();

        console.log('[CredentialsManager] ✅ Fresh token obtained, userId:', userId);
        return credentials;

    } catch (error) {
        console.error('[CredentialsManager] ❌ Failed to fetch fresh token:', error.message);
        throw error;
    }
};

/**
 * Check if cached credentials are still valid
 */
const isCacheValid = () => {
    if (!cachedCredentials) return false;
    return (Date.now() - cacheTimestamp) < TOKEN_TTL_MS;
};

/**
 * Get credentials, auto-fetching fresh token if expired
 */
export const getCredentials = async () => {
    // Return cached if valid
    if (isCacheValid()) {
        console.log('[CredentialsManager] Using cached credentials');
        return cachedCredentials;
    }

    // Fetch fresh token
    try {
        return await fetchFreshToken();
    } catch (error) {
        // If fetch fails and we have cached credentials, use them anyway
        if (cachedCredentials) {
            console.log('[CredentialsManager] Using stale cached credentials');
            return cachedCredentials;
        }

        // Last resort: return fallback credentials
        console.log('[CredentialsManager] Using fallback credentials');
        return getFallbackCredentials();
    }
};

/**
 * Force refresh credentials (call this when API returns error 12)
 */
export const refreshCredentials = async () => {
    console.log('[CredentialsManager] Force refreshing credentials...');
    cachedCredentials = null;
    cacheTimestamp = 0;
    return await fetchFreshToken();
};

/**
 * Fallback credentials in case token service is unavailable
 */
const getFallbackCredentials = () => {
    return {
        deviceId: 'fcc86839-afe2-4f5a-8aef-b3f8508814b5',
        androidId: 'ffffffff4cf770a35116e9998f331152e22e55e700000000',
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWdpc3RlclR5cGUiOiJURU1QIiwidXNlcklkIjozNzY0NTQxMDJ9.bzyzspiGs8n6pXine_3IJo3dQWsGFfCsie2CF7D5LI',
        userId: '376454102',
        afid: `${Date.now()}-${Math.floor(Math.random() * 10000000000000000)}`,
        ins: Date.now().toString(),
        instanceId: 'fcc86839afe24f5a8aefb3f8508814b5'
    };
};

/**
 * Build tnHeader from raw JWT token
 * Format: "Bearer <base64(JWT)>"
 */
export const buildTnHeader = (token) => {
    if (!token) return '';
    return `Bearer ${Buffer.from(token).toString('base64')}`;
};

/**
 * Extract userId from JWT token
 */
export const extractUserId = (token) => {
    if (!token) return '';
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.userId?.toString() || '';
    } catch {
        return '';
    }
};

/**
 * Generate new random device identifiers
 */
export const generateNewCredentials = () => {
    const deviceId = crypto.randomUUID();
    const androidId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();

    return {
        deviceId,
        androidId,
        token: '',
        userId: '',
        afid: `${timestamp}-${Math.floor(Math.random() * 10000000000000000)}`,
        ins: timestamp,
        instanceId: crypto.randomBytes(16).toString('hex')
    };
};

export default {
    getCredentials,
    refreshCredentials,
    fetchFreshToken,
    generateNewCredentials,
    buildTnHeader,
    extractUserId
};
