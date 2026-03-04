import axios from 'axios';
import crypto from 'crypto';

/**
 * FreeReels Bypass Utility
 * Silently extracts episode streams from the FreeReels API using the identical DramaWave episode IDs.
 */

const CONFIG = {
    baseUrl: 'https://apiv2.free-reels.com/frv2-api',
    host: 'apiv2.free-reels.com',
    appName: 'com.freereels.app',
    oauthSecret: '8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv'
};

const DEVICE_ID = crypto.randomBytes(16).toString('hex');

const COMMON_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=UTF-8',
    'User-Agent': 'okhttp/4.12.0',
    'device-id': DEVICE_ID,
    'device': 'android',
    'device-version': '34',
    'app-version': '1.7.01',
    'language': 'id-ID',
    'timezone': '+7',
    'Host': CONFIG.host,
    'app-name': CONFIG.appName
};

let currentToken = '';
let currentSecret = '';

/**
 * Perform anonymous login to FreeReels
 */
export async function authenticate() {
    if (currentToken) return true; // Already authenticated

    const rawSign = `${CONFIG.oauthSecret}${DEVICE_ID}`;
    const sign = crypto.createHash('md5').update(rawSign).digest('hex');
    const url = `${CONFIG.baseUrl}/anonymous/login`;

    const payload = {
        device_id: DEVICE_ID,
        device_name: 'Google Pixel 8',
        sign: sign
    };

    try {
        const res = await axios.post(url, payload, { headers: COMMON_HEADERS });
        if (res.data && res.data.data) {
            currentToken = res.data.data.auth_key || '';
            currentSecret = res.data.data.auth_secret || '';
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[FreeReelsBypass] Login Failed:`, e.message);
        return false;
    }
}

/**
 * Generate Authorization signature
 */
function getAuthHeader() {
    if (!currentToken) return {};
    const ts = Date.now();
    const signString = `${CONFIG.oauthSecret}&${currentSecret}`;
    const signature = crypto.createHash('md5').update(signString).digest('hex');

    return {
        'Authorization': `oauth_signature=${signature},oauth_token=${currentToken},ts=${ts}`
    };
}

/**
 * Get the direct stream URL for any episode ID
 * FreeReels does not strictly enforce locks like DramaWave does.
 */
export async function getStream(seriesId, episodeIndex) {
    await authenticate();

    // Video URLs are embedded in the info_v2 episode_list
    const url = `${CONFIG.baseUrl}/drama/info_v2?series_id=${seriesId}&scene=for_you`;
    const headers = {
        ...COMMON_HEADERS,
        ...getAuthHeader()
    };

    try {
        const res = await axios.get(url, { headers });
        if (res.data && res.data.data) {
            const seriesData = res.data.data.info || res.data.data;
            const episodeList = seriesData.episode_list || seriesData.episodes || seriesData.items || [];

            const episode = episodeList.find(ep => ep.index === episodeIndex);

            if (episode) {
                const videoUrl = episode.external_audio_h264_m3u8 || episode.m3u8_url || episode.video_url || '';
                if (videoUrl) {
                    console.log(`[FreeReelsBypass] Successfully extracted bypassed stream for ${seriesId}:${episodeIndex}`);
                    return {
                        url: videoUrl,
                        duration: episode.duration || 0,
                        success: true
                    };
                }
            }
        }
        return { success: false, url: null };
    } catch (e) {
        console.error(`[FreeReelsBypass] Stream Error for ${seriesId}:${episodeIndex}:`, e.message);
        return { success: false, url: null };
    }
}
