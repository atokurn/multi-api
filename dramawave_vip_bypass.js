import axios from 'axios';
import crypto from 'crypto';

// ==========================================
// DRAMAWAVE VIP BYPASS SCRIPT (VIA FREEREELS)
// ==========================================

const DEVICE_ID = crypto.randomBytes(16).toString('hex');

const CONFIG = {
    dramawave: {
        baseUrl: 'https://api.mydramawave.com/dm-api',
        host: 'api.mydramawave.com',
        appName: 'com.dramawave.app',
        oauthSecret: 'w1TqO1a2hG',
        signLogic: 'dramawave' // MD5(OAUTH_SECRET + deviceId + deviceBrand + deviceModel)
    },
    freereels: {
        baseUrl: 'https://apiv2.free-reels.com/frv2-api',
        host: 'apiv2.free-reels.com',
        appName: 'com.freereels.app',
        oauthSecret: '8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv',
        signLogic: 'freereels' // MD5(OAUTH_SECRET + deviceId)
    }
};

const SESSIONS = {
    dramawave: { token: '', secret: '' },
    freereels: { token: '', secret: '' }
};

const COMMON_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=UTF-8',
    'User-Agent': 'okhttp/4.12.0',
    'device-id': DEVICE_ID,
    'device': 'android',
    'device-version': '34',
    'app-version': '1.7.01',
    'language': 'id-ID',
    'timezone': '+7'
};

/**
 * Generate Authorization signature
 */
function getAuthHeader(provider) {
    const session = SESSIONS[provider];
    if (!session.token) return {};

    const conf = CONFIG[provider];
    const ts = Date.now();
    const signString = `${conf.oauthSecret}&${session.secret}`;
    const signature = crypto.createHash('md5').update(signString).digest('hex');

    return {
        'Authorization': `oauth_signature=${signature},oauth_token=${session.token},ts=${ts}`
    };
}

/**
 * Perform anonymous login for a specific provider
 */
async function login(provider) {
    const conf = CONFIG[provider];
    let rawSign = '';

    if (conf.signLogic === 'dramawave') {
        // DramaWave uses deviceBrand and deviceModel
        rawSign = `${conf.oauthSecret}${DEVICE_ID}GooglePixel 8`.replace(/\s+/g, '');
    } else {
        // FreeReels uses only deviceId
        rawSign = `${conf.oauthSecret}${DEVICE_ID}`;
    }

    const sign = crypto.createHash('md5').update(rawSign).digest('hex');
    const url = `${conf.baseUrl}/anonymous/login`;

    const headers = {
        ...COMMON_HEADERS,
        'Host': conf.host,
        'app-name': conf.appName
    };

    const payload = {
        device_id: DEVICE_ID,
        device_name: 'Google Pixel 8',
        sign: sign
    };

    try {
        const res = await axios.post(url, payload, { headers });
        if (res.data && res.data.data) {
            SESSIONS[provider].token = res.data.data.auth_key || '';
            SESSIONS[provider].secret = res.data.data.auth_secret || '';
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[${provider}] Login Failed:`, e.message);
        return false;
    }
}

/**
 * Fetch generic endpoint with authentication
 */
async function apiGet(provider, endpoint) {
    const conf = CONFIG[provider];
    const url = `${conf.baseUrl}${endpoint}`;
    const headers = {
        ...COMMON_HEADERS,
        'Host': conf.host,
        'app-name': conf.appName,
        ...getAuthHeader(provider)
    };

    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (e) {
        console.error(`[${provider}] GET ${endpoint} Failed:`, e.message);
        return null;
    }
}

/**
 * Main Bypass Logic
 */
async function bypassVIP(dramaId, episodeIndex) {
    console.log(`\n================================`);
    console.log(`🎬 DRAMAWAVE VIP BYPASS SCRIPT`);
    console.log(`================================\n`);
    console.log(`Target Drama ID : ${dramaId}`);
    console.log(`Target Episode  : ${episodeIndex}`);
    console.log(`--------------------------------`);

    // 1. Login to both providers
    process.stdout.write(`\n1. Authenticating DramaWave... `);
    await login('dramawave');
    console.log(`[OK]`);

    process.stdout.write(`2. Authenticating FreeReels... `);
    await login('freereels');
    console.log(`[OK]`);

    // 2. Fetch Drama Info from DramaWave (just to get the title and confirm it exists)
    console.log(`\n3. Fetching Metadata from DramaWave...`);
    const infoRes = await apiGet('dramawave', `/drama/info_v2?drama_id=${dramaId}`);

    if (!infoRes || !infoRes.data || !infoRes.data.info) {
        console.log(`[!] Drama ID ${dramaId} not found on DramaWave!`);
        return;
    }

    const dramaTitle = infoRes.data.info.title;
    console.log(`   Title: ${dramaTitle}`);
    console.log(`   Total Episodes: ${infoRes.data.info.total_episodes}`);

    // Fetch episode list to get the real episode ID
    const episodesRes = await apiGet('dramawave', `/episode/list_v2?drama_id=${dramaId}&page=1&limit=500`);
    if (!episodesRes || !episodesRes.data || !episodesRes.data.list) {
        console.log(`[!] Failed to fetch episode list!`);
        return;
    }

    const episodeData = episodesRes.data.list.find(e => e.series_number == episodeIndex);
    if (!episodeData) {
        console.log(`[!] Episode ${episodeIndex} does not exist in this drama!`);
        return;
    }

    console.log(`   Episode ID found: ${episodeData.id}`);

    if (episodeData.is_pay) {
        console.log(`   Status: 🔒 VIP LOCKED (on DramaWave)`);
    } else {
        console.log(`   Status: 🔓 FREE (on DramaWave)`);
    }

    // 3. Bypass VIP by fetching the stream from FreeReels using the same Episode ID
    console.log(`\n4. Opening Lock via FreeReels Base...`);
    // Need to use the /drama/get_stream endpoint on FreeReels
    const streamRes = await apiGet('freereels', `/drama/get_stream?episode_id=${episodeData.id}`);

    if (streamRes && streamRes.data && streamRes.data.video) {
        const videoUrl = streamRes.data.video.url;
        console.log(`\n✅ BYPASS SUCCESSFUL!`);
        console.log(`--------------------------------`);
        console.log(`📺 EXTRACTED M3U8 STREAM URL:`);
        console.log(`\x1b[32m${videoUrl}\x1b[0m`);
        console.log(`--------------------------------\n`);
        console.log(`(You can open this URL in VLC Media Player or any HLS-supported web player)`);
    } else {
        console.log(`\n❌ BYPASS FAILED.`);
        if (streamRes) console.log(`FreeReels Response: ${streamRes.message || streamRes.msg}`);
    }
}

// Check arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log(`Usage: node dramawave_vip_bypass.js <DRAMA_ID> <EPISODE_NUMBER>`);
    console.log(`Example: node dramawave_vip_bypass.js 3P2JjRW2rq 15`);
    process.exit(1);
}

const targetDramaId = args[0];
const targetEpisode = parseInt(args[1], 10);

bypassVIP(targetDramaId, targetEpisode);
