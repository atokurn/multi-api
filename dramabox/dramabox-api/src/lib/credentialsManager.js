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
 * - Credential Pool for Rate Limit Avoidance
 */

import crypto from 'crypto';

// Token service URL
const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || 'https://dramabox-token.vercel.app/token';

// Token cache TTL (4 hours - tokens usually expire after several hours)
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

// Credential Pool
const POOL_SIZE = 5;
const credentialPool = new Array(POOL_SIZE).fill(null);
let currentPoolIndex = 0;

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

        console.log('[CredentialsManager] ✅ Fresh token obtained, userId:', userId);
        return credentials;

    } catch (error) {
        console.error('[CredentialsManager] ❌ Failed to fetch fresh token:', error.message);
        throw error;
    }
};

/**
 * Check if a specific credential set is valid
 */
const isCredentialValid = (cred) => {
    if (!cred) return false;
    return (Date.now() - cred.fetchedAt) < TOKEN_TTL_MS;
};

/**
 * Get credentials, auto-fetching if expired or missing
 * Supporting credential pool for rate-limit avoidance
 * 
 * @param {number} forceIndex - Optional: force use specific pool index
 */
export const getCredentials = async (forceIndex = null) => {
    const index = forceIndex !== null ? forceIndex : currentPoolIndex;

    // Return cached if valid
    if (isCredentialValid(credentialPool[index])) {
        // console.log(`[CredentialsManager] Using cached credentials (Pool ${index})`);
        return credentialPool[index];
    }

    console.log(`[CredentialsManager] Pool ${index} expired/empty. Fetching fresh...`);

    // Fetch fresh token
    try {
        const newCred = await fetchFreshToken();
        credentialPool[index] = newCred;
        return newCred;
    } catch (error) {
        // If fetch fails and we have stale credentials, use them
        if (credentialPool[index]) {
            console.log(`[CredentialsManager] Using stale cached credentials (Pool ${index})`);
            return credentialPool[index];
        }

        // Last resort: fallback
        console.log('[CredentialsManager] Using fallback credentials');
        return getFallbackCredentials();
    }
};

/**
 * Rotate to the next credential in the pool
 * Used when current credential is rate-limited
 */
export const rotateCredentials = async () => {
    const oldIndex = currentPoolIndex;
    currentPoolIndex = (currentPoolIndex + 1) % POOL_SIZE;
    console.log(`[CredentialsManager] 🔄 Rotating credentials from Pool ${oldIndex} to Pool ${currentPoolIndex}`);

    // Ensure the new slot has valid credentials
    return await getCredentials();
};

/**
 * Force refresh specific credential (e.g. if token expired)
 */
export const refreshCredentials = async () => {
    console.log(`[CredentialsManager] Force refreshing credentials for Pool ${currentPoolIndex}...`);
    credentialPool[currentPoolIndex] = null;
    const newCred = await fetchFreshToken();
    credentialPool[currentPoolIndex] = newCred;
    return newCred;
};

/**
 * Initialize the credential pool (pre-fill)
 */
export const initializePool = async () => {
    console.log('[CredentialsManager] Initializing credential pool...');
    // We don't fetch all at once to avoid hammering the token service
    // Just ensure the first one is ready
    await getCredentials(0);
    // Pre-warm additional slots in background
    setTimeout(async () => {
        try { await getCredentials(1); } catch (e) { 
            console.warn('[CredentialsManager] Pre-warm slot 1 failed:', e.message); 
        }
    }, 2000);
    setTimeout(async () => {
        try { await getCredentials(2); } catch (e) { 
            console.warn('[CredentialsManager] Pre-warm slot 2 failed:', e.message); 
        }
    }, 4000);
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
        instanceId: 'fcc86839afe24f5a8aefb3f8508814b5',
        fetchedAt: Date.now() // Mock timestamp
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
    rotateCredentials,
    initializePool,
    fetchFreshToken,
    generateNewCredentials,
    buildTnHeader,
    extractUserId
};
