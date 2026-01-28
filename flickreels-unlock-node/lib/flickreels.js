/**
 * FlickReels API Client (Simplified for unlock node)
 */

import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'https://api.farsunpteltd.com';
const SIGN_SALT = 'nW8GqjbdSYRI';

const NODE_ID = process.env.NODE_ID || '1';
const TOKEN = (process.env.FLICKREELS_TOKEN || '').trim().replace(/[\r\n]/g, '');

const DEVICE = {
    main_package_id: 100,
    device_id: process.env.DEVICE_ID || '5936472655611864',
    device_sign: process.env.DEVICE_SIGN || 'b4c167151eb9742d37778d613460ccdc542d0c9e42e49e815bb6a0c4c217e37f',
    apps_flyer_uid: process.env.APPS_FLYER_UID || '1766911071302-3161096974023551356',
    os: 'android',
    device_brand: 'Google',
    device_number: '14',
    language_id: '6',
    countryCode: 'ID'
};

function generateNonce(len = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function generateSign(body) {
    const filtered = {};
    for (const [k, v] of Object.entries(body)) {
        if (v === null || v === undefined || v === '' || typeof v === 'boolean') continue;
        filtered[k] = v;
    }
    const parts = Object.keys(filtered).sort().map(k => {
        const v = filtered[k];
        return `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`;
    });
    return crypto.createHash('md5').update(parts.join('&') + `&signSalt=${SIGN_SALT}`).digest('hex');
}

async function request(endpoint, body = {}) {
    const requestBody = { ...DEVICE, ...body };
    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Version': '2.2.1.1',
        'Sign': generateSign(requestBody),
        'Timestamp': Math.floor(Date.now() / 1000).toString(),
        'Nonce': generateNonce(),
        'Token': TOKEN
    };

    const response = await axios.post(`${BASE_URL}${endpoint}`, requestBody, { headers, timeout: 30000 });
    return response.data;
}

async function unlockChapter(playletId, chapterId) {
    console.log(`[Node ${NODE_ID}] Unlocking playlet=${playletId} chapter=${chapterId}`);

    // Step 1: Show rewarded ad
    const showResp = await request('/app/ad/showRewarded', { playlet_id: String(playletId) });
    console.log(`[Node ${NODE_ID}] showRewarded:`, showResp?.status_code, showResp?.msg);

    await new Promise(r => setTimeout(r, 1000));

    // Step 2: Claim reward
    const rewardResp = await request('/app/ad/reward', {
        playlet_id: String(playletId),
        chapter_id: String(chapterId),
        ad_id: 'ca-app-pub-3044094697674248/2006771729',
        ad_num: '1',
        free_num: '1'
    });
    console.log(`[Node ${NODE_ID}] claimReward:`, rewardResp?.status_code, rewardResp?.msg);

    // Check for limit
    if (rewardResp?.status_code === -1) {
        const msg = rewardResp?.msg || '';
        if (msg.includes('Batas') || msg.includes('limit') || msg.includes('tercapai')) {
            return { success: false, error: 'LIMIT_REACHED', message: msg };
        }
        if (msg.includes('sering') || msg.includes('frequent')) {
            return { success: false, error: 'RATE_LIMITED', message: msg };
        }
    }

    await new Promise(r => setTimeout(r, 500));

    // Step 3: Get unlocked video URL
    const playResp = await request('/app/playlet/play', {
        playlet_id: String(playletId),
        chapter_id: String(chapterId),
        auto_unlock: true,
        chapter_type: 0,
        fragmentPosition: 0,
        source: 1
    });

    const videoUrl = playResp?.data?.hls_url;

    if (videoUrl) {
        return { success: true, videoUrl, nodeId: NODE_ID };
    }

    return {
        success: false,
        error: 'NO_VIDEO_URL',
        showRewarded: showResp,
        reward: rewardResp,
        chapter: playResp
    };
}

export { unlockChapter, request, NODE_ID };
