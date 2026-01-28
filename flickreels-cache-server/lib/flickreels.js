/**
 * FlickReels API Client with Per-Device Token Authentication
 * Each device has its own token = independent daily limits
 * 5 devices × 8-10 unlocks = ~40-50 unlocks/day
 */

import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'https://api.farsunpteltd.com';
const SIGN_SALT = 'nW8GqjbdSYRI';
const CDN_BASE = 'https://zshipricf.farsunpteltd.com';

// Device pool with individual tokens
// Each device gets its own account = independent limit
const DEVICE_POOL = [
    {
        device_id: '5936472655611864',
        device_sign: 'b4c167151eb9742d37778d613460ccdc542d0c9e42e49e815bb6a0c4c217e37f',
        apps_flyer_uid: '1766911071302-3161096974023551356',
        token: null,
        initialized: false
    },
    {
        device_id: '7588647109784749575',
        device_sign: crypto.createHash('sha256').update('device2_fixed').digest('hex'),
        apps_flyer_uid: '1767000000001-3161096974023551357',
        token: null,
        initialized: false
    },
    {
        device_id: '8912345678901234567',
        device_sign: crypto.createHash('sha256').update('device3_fixed').digest('hex'),
        apps_flyer_uid: '1767100000002-3161096974023551358',
        token: null,
        initialized: false
    },
    {
        device_id: '1234567890123456789',
        device_sign: crypto.createHash('sha256').update('device4_fixed').digest('hex'),
        apps_flyer_uid: '1767200000003-3161096974023551359',
        token: null,
        initialized: false
    },
    {
        device_id: '9876543210987654321',
        device_sign: crypto.createHash('sha256').update('device5_fixed').digest('hex'),
        apps_flyer_uid: '1767300000004-3161096974023551360',
        token: null,
        initialized: false
    }
];

// Fallback token from environment (used for first device if login fails)
const FALLBACK_TOKEN = (process.env.FLICKREELS_TOKEN || '').trim().replace(/[\r\n]/g, '');

let currentDeviceIndex = 0;
const failedDevices = new Set();

function generateNonce(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateSign(body) {
    const filtered = {};
    for (const [key, value] of Object.entries(body)) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' && value === '') continue;
        if (typeof value === 'boolean') continue;
        filtered[key] = value;
    }

    const sortedKeys = Object.keys(filtered).sort();
    const parts = sortedKeys.map(key => {
        const value = filtered[key];
        if (Array.isArray(value) || typeof value === 'object') {
            return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
    });

    const signString = parts.join('&') + `&signSalt=${SIGN_SALT}`;
    return crypto.createHash('md5').update(signString).digest('hex');
}

/**
 * Make authenticated request using device's own token
 */
async function request(endpoint, body = {}, deviceIndex = null) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const idx = deviceIndex !== null ? deviceIndex : currentDeviceIndex;
    const device = DEVICE_POOL[idx];

    const deviceBody = {
        main_package_id: 100,
        device_id: device.device_id,
        device_sign: device.device_sign,
        apps_flyer_uid: device.apps_flyer_uid,
        os: 'android',
        device_brand: 'Google',
        device_number: '14',
        language_id: '6',
        countryCode: 'ID'
    };

    const requestBody = { ...deviceBody, ...body };
    const sign = generateSign(requestBody);

    // Use device's own token or fallback
    const token = device.token || FALLBACK_TOKEN || '';

    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Version': '2.2.1.1',
        'Sign': sign,
        'Timestamp': timestamp,
        'Nonce': nonce,
        'Token': token
    };

    try {
        const response = await axios.post(`${BASE_URL}${endpoint}`, requestBody, {
            headers,
            timeout: 30000
        });
        return response.data;
    } catch (error) {
        console.error(`[FlickReels] Request failed:`, error.message);
        throw error;
    }
}

/**
 * Login a specific device to get its unique token
 */
async function loginDevice(deviceIndex) {
    const device = DEVICE_POOL[deviceIndex];
    console.log(`[FlickReels] Logging in device ${deviceIndex}: ${device.device_id.slice(0, 8)}...`);

    try {
        const response = await request('/app/login/loginWithDeviceId', {}, deviceIndex);

        if (response?.data?.token) {
            device.token = response.data.token;
            device.initialized = true;
            console.log(`[FlickReels] Device ${deviceIndex} logged in successfully`);
            return true;
        }

        console.log(`[FlickReels] Device ${deviceIndex} login failed:`, response?.msg);
        return false;
    } catch (error) {
        console.error(`[FlickReels] Device ${deviceIndex} login error:`, error.message);
        return false;
    }
}

/**
 * Initialize all devices with their unique tokens
 */
async function initializeAllDevices() {
    console.log('[FlickReels] Initializing all devices...');

    for (let i = 0; i < DEVICE_POOL.length; i++) {
        if (!DEVICE_POOL[i].initialized) {
            await loginDevice(i);
            // Small delay between logins to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const initialized = DEVICE_POOL.filter(d => d.initialized).length;
    console.log(`[FlickReels] Initialized ${initialized}/${DEVICE_POOL.length} devices`);
    return initialized;
}

/**
 * Ensure current device is initialized before use
 */
async function ensureDeviceInitialized(deviceIndex) {
    const device = DEVICE_POOL[deviceIndex];
    if (!device.initialized && !device.token) {
        await loginDevice(deviceIndex);
    }
}

function rotateDevice() {
    const previousIndex = currentDeviceIndex;
    currentDeviceIndex = (currentDeviceIndex + 1) % DEVICE_POOL.length;
    console.log(`[FlickReels] Rotated device: ${previousIndex} -> ${currentDeviceIndex}`);
    return currentDeviceIndex;
}

function markDeviceFailed(index) {
    failedDevices.add(index);
    console.log(`[FlickReels] Device ${index} marked as failed. Failed: ${failedDevices.size}/${DEVICE_POOL.length}`);
}

function resetFailedDevices() {
    failedDevices.clear();
    currentDeviceIndex = 0;
    console.log('[FlickReels] Reset all failed devices');
}

function getCurrentDeviceIndex() {
    while (failedDevices.has(currentDeviceIndex) && failedDevices.size < DEVICE_POOL.length) {
        currentDeviceIndex = (currentDeviceIndex + 1) % DEVICE_POOL.length;
    }
    return currentDeviceIndex;
}

async function getChapterList(playletId) {
    const response = await request('/app/playlet/chapterList', {
        playlet_id: String(playletId),
        auto_unlock: true,
        chapter_type: -1,
        fragmentPosition: 0,
        source: 1
    });

    if (!response?.data?.list) {
        return response;
    }

    const episodes = response.data.list.map(chapter => {
        let videoUrl = null;
        if (chapter.hls_url && chapter.hls_url.trim() !== '') {
            videoUrl = chapter.hls_url;
        } else if (chapter.origin_down_url && chapter.origin_down_url.trim() !== '') {
            videoUrl = `${CDN_BASE}${chapter.origin_down_url}`;
        }

        return {
            id: chapter.id,
            index: chapter.chapter_index,
            title: chapter.title || `Episode ${chapter.chapter_index}`,
            videoUrl,
            isVip: chapter.is_vip_episode === 1,
            isLocked: chapter.is_lock === 1,
            hasVideo: videoUrl !== null
        };
    });

    return { success: true, playletId, totalEpisodes: episodes.length, episodes };
}

async function getPlayletDetail(playletId) {
    const response = await request('/app/playlet/play', {
        playlet_id: String(playletId),
        auto_unlock: false,
        chapter_type: -1,
        fragmentPosition: 0,
        source: 1
    });

    if (!response?.data) return response;

    const data = response.data;
    return {
        success: true,
        playlet: {
            id: data.playlet?.id || playletId,
            title: data.playlet?.title,
            cover: data.playlet?.cover_url,
            description: data.playlet?.description,
            totalEpisodes: data.playlet?.chapter_count,
            category: data.playlet?.category_name,
            tags: data.playlet?.tags || []
        }
    };
}

async function showRewarded(playletId, deviceIndex) {
    return request('/app/ad/showRewarded', { playlet_id: String(playletId) }, deviceIndex);
}

async function claimAdReward(playletId, chapterId, deviceIndex, adId = 'ca-app-pub-3044094697674248/2006771729') {
    return request('/app/ad/reward', {
        playlet_id: String(playletId),
        chapter_id: String(chapterId),
        ad_id: adId,
        ad_num: '1',
        free_num: '1'
    }, deviceIndex);
}

/**
 * Unlock chapter with per-device token rotation
 * Each device has independent daily limit
 */
async function unlockChapterWithAd(playletId, chapterId, maxRetries = DEVICE_POOL.length) {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const deviceIndex = getCurrentDeviceIndex();

        // Ensure device has its own token
        await ensureDeviceInitialized(deviceIndex);

        console.log(`[FlickReels] Unlock attempt ${attempt + 1}/${maxRetries} with device ${deviceIndex}`);

        try {
            // Step 1: Show rewarded ad
            const showResp = await showRewarded(playletId, deviceIndex);
            console.log('[FlickReels] showRewarded:', showResp?.status_code, showResp?.msg);

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 2: Claim reward
            const rewardResp = await claimAdReward(playletId, chapterId, deviceIndex);
            console.log('[FlickReels] claimAdReward:', rewardResp?.status_code, rewardResp?.msg);

            // Check for limit/rate errors
            if (rewardResp?.status_code === -1) {
                const msg = rewardResp?.msg || '';
                if (msg.includes('Batas') || msg.includes('limit') || msg.includes('tercapai')) {
                    console.log(`[FlickReels] Device ${deviceIndex} hit daily limit, rotating...`);
                    markDeviceFailed(deviceIndex);
                    rotateDevice();
                    lastError = msg;
                    continue;
                }
                if (msg.includes('sering') || msg.includes('frequent')) {
                    console.log(`[FlickReels] Rate limited, waiting 3s...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Step 3: Fetch unlocked chapter
            const playResp = await request('/app/playlet/play', {
                playlet_id: String(playletId),
                chapter_id: String(chapterId),
                auto_unlock: true,
                chapter_type: 0,
                fragmentPosition: 0,
                source: 1
            }, deviceIndex);

            const videoUrl = playResp?.data?.hls_url || playResp?.data?.chapter_info?.hls_url;

            if (videoUrl) {
                return {
                    success: true,
                    videoUrl,
                    deviceIndex,
                    showRewarded: showResp,
                    reward: rewardResp,
                    chapter: playResp
                };
            }

            if (!videoUrl && attempt < maxRetries - 1) {
                rotateDevice();
                continue;
            }

            return {
                success: false,
                message: 'Could not get video URL',
                deviceIndex,
                showRewarded: showResp,
                reward: rewardResp,
                chapter: playResp
            };

        } catch (error) {
            console.error(`[FlickReels] Error on device ${deviceIndex}:`, error.message);
            lastError = error.message;
            rotateDevice();
        }
    }

    return {
        success: false,
        message: 'All devices exhausted or hit daily limit',
        error: lastError,
        failedDevices: failedDevices.size,
        totalDevices: DEVICE_POOL.length
    };
}

function getDeviceStatus() {
    return DEVICE_POOL.map((d, i) => ({
        index: i,
        deviceId: d.device_id.slice(0, 8) + '...',
        hasToken: !!d.token,
        initialized: d.initialized,
        failed: failedDevices.has(i)
    }));
}

export {
    request,
    getChapterList,
    getPlayletDetail,
    showRewarded,
    claimAdReward,
    unlockChapterWithAd,
    loginDevice,
    initializeAllDevices,
    rotateDevice,
    resetFailedDevices,
    getDeviceStatus,
    DEVICE_POOL,
    CDN_BASE
};
