
import axios from 'axios';

const SAPIMU_BASE_URL = 'https://sapimu.au/dramawave/api/v1';
const SAPIMU_TOKEN = process.env.SAPIMU_TOKEN || '7a8afe6e16e01f607c82e19f035956e0492163c986f6f9654bfa822a1010a087';

// Create axios instance for sapimu
const sapimuClient = axios.create({
    baseURL: SAPIMU_BASE_URL,
    timeout: 30000,
    headers: {
        'Authorization': `Bearer ${SAPIMU_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Normalize episode data from Sapimu API response
 */
function normalizeEpisode(ep) {
    return {
        id: ep.id,
        index: ep.index,
        title: `Episode ${ep.index}`,
        cover: ep.cover,
        duration: ep.duration,
        isVip: !ep.unlock,
        videoUrl: ep.external_audio_h264_m3u8 || ep.m3u8_url || ep.video_url || null,
        releaseTime: new Date(ep.update_time * 1000).toISOString()
    };
}

/**
 * Search dramas
 */
export async function search(keyword, page = 1) {
    try {
        console.log(`[ShortMax] Searching for "${keyword}" via Sapimu...`);
        // Mock search or implement if endpoint known
        return { data: [] };
    } catch (error) {
        console.error('[ShortMax] Search error:', error.message);
        return { data: [] };
    }
}

/**
 * Get Recommendations (For You)
 */
export async function getForYou(page = 1) {
    // Sapimu endpoint for home/for-you not fully clear from reference service, return empty
    return { data: [] };
}

/**
 * Get Rankings
 */
export async function getRanking(page = 1, type = 'daily') {
    return { data: [] };
}

/**
 * Get Drama Detail
 */
export async function getDetail(code) {
    try {
        console.log(`[ShortMax] Fetching Detail for ${code} via Sapimu...`);
        const response = await sapimuClient.get(`/dramas/${code}`, {
            params: { lang: 'id-ID' }
        });

        if (response.data?.code === 200) {
            const info = response.data.data?.info || {};
            return {
                id: info.id,
                title: info.name,
                description: info.desc,
                cover: info.cover,
                episodeCount: info.episode_count,
                episodes: (info.episode_list || []).map(normalizeEpisode)
            };
        }
        return null;
    } catch (error) {
        console.error('[ShortMax] getDetail error:', error.message);
        return null;
    }
}

/**
 * Get Chapter List 
 * (Sapimu returns chapters in detail, so we reuse getDetail)
 */
export async function getChapters(code, page = 1) {
    const detail = await getDetail(code);
    if (detail) {
        return { data: detail.episodes };
    }
    return { data: [] };
}

/**
 * Get Video URL
 * Note: Sapimu provides video URL in Detail/Chapters directly.
 * This function handles fetching it specifically if needed.
 */
export async function getVideoUrl(dramaId, index = 1) {
    try {
        // If first arg is an object, try to extract. 
        // But traditional call is (chapterId), which doesn't work well here.
        // We will assume the caller passes (DramaID, EpisodeIndex) for Sapimu.

        console.log(`[ShortMax] Playing ${dramaId} Episode ${index} via Sapimu...`);
        const response = await sapimuClient.get(`/dramas/${dramaId}/play/${index}`, {
            params: { lang: 'id-ID' }
        });

        if (response.data?.code === 200) {
            const ep = response.data.data;
            return {
                videoUrl: ep.external_audio_h264_m3u8 || ep.m3u8_url || ep.video_url,
                isVip: !ep.unlock
            };
        }
        return null;
    } catch (error) {
        console.error('[ShortMax] getVideoUrl error:', error.message);
        return null;
    }
}

export async function getSdkDeviceConfig() {
    return { deviceId: 'sapimu-proxy', token: SAPIMU_TOKEN };
}
