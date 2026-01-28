/**
 * ========================================
 * FlickReels Service
 * ========================================
 * 
 * Service layer for FlickReels API operations.
 * Handles business logic and data transformation.
 * 
 * Features:
 * - VIP bypass via token or unlock nodes
 * - Always fetches fresh URLs (no caching of HLS URLs)
 */

import * as flickreelsClient from '../lib/flickreelsClient.js';

// CDN Base URL for constructing video URLs from origin_down_url
const FLICKREELS_CDN_BASE = 'https://zshipricf.farsunpteltd.com';

/**

 * Get home navigation tabs
 * @param {string} lang - Language code (default: 'id')
 */
async function getNavigation(lang = 'id') {
    const response = await flickreelsClient.request('/app/playlet/navigation', {}, lang);
    return response;
}

/**
 * Get navigation column data (tab content)
 */
async function getNavigationColumn(columnId, page = '') {
    const response = await flickreelsClient.request('/app/playlet/navigationColumn', {
        column_id: columnId,
        page: page,
        page_size: 10
    });
    return response;
}

/**
 * Get For You recommendations
 * @param {string} page - Page cursor
 * @param {number} pageSize - Page size
 * @param {string} lang - Language code (default: 'id')
 */
async function getForYou(page = '', pageSize = 10, lang = 'id') {
    const response = await flickreelsClient.request('/app/playlet/forYou', {
        page: page,
        page_size: pageSize
    }, lang);
    return response;
}

/**
 * Get hot ranking
 * @param {string} lang - Language code (default: 'id')
 */
async function getHotRank(lang = 'id') {
    const response = await flickreelsClient.request('/app/playlet/hotRank', {}, lang);
    return response;
}

/**
 * Get playlet/drama detail
 */
async function getPlayletDetail(playletId) {
    const response = await flickreelsClient.request('/app/playlet/play', {
        playlet_id: String(playletId),
        auto_unlock: false,
        chapter_type: -1,
        fragmentPosition: 0,
        source: 1,
        vip_btn_scene: '{"scene_type":[1,3],"play_type":1,"collection_status":0}'
    });
    return response;
}

/**
 * Get chapter/episode list
 * Note: auto_unlock: true may return authenticated hls_url for VIP episodes
 */
async function getChapterList(playletId, chapterType = -1) {
    const response = await flickreelsClient.request('/app/playlet/chapterList', {
        playlet_id: String(playletId),
        auto_unlock: true,  // Changed to true for VIP bypass
        chapter_type: chapterType,
        fragmentPosition: 0,
        source: 1,
        vip_btn_scene: '{"scene_type":[1,3],"play_type":1,"collection_status":0}'
    });
    return response;
}

/**
 * Get recommended dramas
 * @param {string} lang - Language code (default: 'id')
 */
async function getRecommend(lang = 'id') {
    const response = await flickreelsClient.request('/app/playlet/recommend', {}, lang);
    return response;
}

/**
 * Get first look playlet
 */
async function getFirstLookPlaylet() {
    const response = await flickreelsClient.request('/app/playlet/getFirstLookPlaylet', {});
    return response;
}

/**
 * Get app bootstrap/config data
 */
async function getBootstrap() {
    const response = await flickreelsClient.request('/app/common/bootstrap', {});
    return response;
}

/**
 * Login with device ID
 */
async function loginWithDeviceId() {
    const response = await flickreelsClient.request('/app/login/loginWithDeviceId', {});

    // Store token if login successful
    if (response?.data?.token) {
        flickreelsClient.setToken(response.data.token);
    }

    return response;
}

/**
 * Get signin/check-in data
 */
async function getSigninIndex() {
    const response = await flickreelsClient.request('/app/signin/index', {});
    return response;
}

/**
 * Search playlets (if available)
 */
async function search(keyword, page = '', pageSize = 10) {
    // Correct endpoint: /app/user_search/search (NOT /app/playlet/search)
    const response = await flickreelsClient.request('/app/user_search/search', {
        keyword: keyword,
        is_mid_page: 1,
        page: page,
        page_size: pageSize
    });
    return response;
}

/**
 * Get popular search keywords
 */
async function getSearchRankList() {
    const response = await flickreelsClient.request('/app/user_search/searchRankList', {});
    return response;
}

/**
 * Unlock nodes for auto-unlocking VIP episodes
 * These should be deployed to different Vercel accounts for IP diversity
 */
const UNLOCK_NODES = [
    'https://flickreels-unlock-node.vercel.app',
    'https://flickreels-unlock-node-vert.vercel.app',  // Node 2
    // Add more nodes here when deployed:
    // 'https://flickreels-unlock-node-3.vercel.app',
];

/**
 * Call unlock node to get video URL for VIP episode
 */
async function callUnlockNode(playletId, chapterId) {
    for (const nodeUrl of UNLOCK_NODES) {
        try {
            const response = await fetch(`${nodeUrl}/api/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playletId, chapterId })
            });

            const data = await response.json();

            if (data.success && data.videoUrl) {
                console.log(`[FlickReels] Unlocked via ${nodeUrl}: ${chapterId}`);
                return data.videoUrl;
            }

            // If this node hit limit, try next one
            if (data.error === 'LIMIT_REACHED') {
                console.log(`[FlickReels] Node ${nodeUrl} hit limit, trying next...`);
                continue;
            }

        } catch (error) {
            console.error(`[FlickReels] Unlock node ${nodeUrl} error:`, error.message);
        }
    }
    return null;
}

/**
 * Get all episodes with video URLs (VIP token + unlock node fallback)
 * 
 * ALWAYS fetches fresh from FlickReels API to avoid expired URL issues.
 * Uses VIP token for unlocked content, fallback to unlock node for VIP-only episodes.
 * 
 * @param {string} playletId - The drama/playlet ID
 * @returns {Object} Processed response with episodes containing video URLs
 */
async function getAllEpisodesWithVideo(playletId) {
    const startTime = Date.now();

    // Fetch from FlickReels API (always fresh)
    console.log(`[FlickReels] Fetching episodes from API: ${playletId}`);
    const response = await getChapterList(playletId);

    if (!response?.data?.list) {
        return response;
    }

    // Process episodes to get video URLs
    const processedList = await Promise.all(response.data.list.map(async (chapter) => {
        let videoUrl = null;
        let unlockSource = null;

        // Priority 1: Use hls_url if available with verify token (VIP unlocked)
        if (chapter.hls_url && chapter.hls_url.includes('verify=')) {
            videoUrl = chapter.hls_url;
            unlockSource = 'vip';
        }
        // Priority 2: Free episode with hls_url
        else if (chapter.hls_url && chapter.hls_url.trim() !== '') {
            videoUrl = chapter.hls_url;
            unlockSource = 'free';
        }
        // Priority 3: VIP episode without hls_url - try unlock node (ad reward)
        else if (chapter.is_vip_episode === 1 || chapter.e_is_vip_episode === true) {
            const unlockedUrl = await callUnlockNode(playletId, chapter.chapter_id);
            if (unlockedUrl) {
                videoUrl = unlockedUrl;
                unlockSource = 'ad_reward';
            }
        }

        return {
            ...chapter,
            videoUrl,
            unlockSource,
            isFree: chapter.is_lock !== 1,
            isVip: chapter.is_vip_episode === 1 || chapter.e_is_vip_episode === true,
            isLocked: chapter.is_lock === 1 && !videoUrl,
            hasVideo: videoUrl !== null
        };
    }));

    return {
        ...response,
        data: {
            ...response.data,
            list: processedList,
            responseTime: Date.now() - startTime
        }
    };
}

export {
    getNavigation,
    getNavigationColumn,
    getForYou,
    getHotRank,
    getPlayletDetail,
    getChapterList,
    getRecommend,
    getFirstLookPlaylet,
    getBootstrap,
    loginWithDeviceId,
    getSigninIndex,
    search,
    getSearchRankList,
    getAllEpisodesWithVideo,
    FLICKREELS_CDN_BASE
};
