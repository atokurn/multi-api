/**
 * NetShort API Service
 * 
 * Business logic for proxying NetShort API requests.
 * Endpoints discovered from intercept:
 *   - /video/shortPlay/base/episode/detail_info  (episode detail + video URL)
 *   - /user/shortPlay/userBase/last_play_history  (play history)
 * 
 * Additional endpoints (inferred from APK class names):
 *   - /video/shortPlay/base/home/recommend  (home feed)
 *   - /video/shortPlay/base/search  (search)
 *   - /video/shortPlay/base/detail  (drama detail)
 *   - /video/shortPlay/base/episode/list  (episode list)
 */

import * as netshortClient from '../lib/netshortClient.js';
import { responseCache } from '../lib/responseCache.js';

/**
 * Get home feed / recommendations
 */
export async function getHome(page = 1) {
    try {
        console.log(`[NetShort Service] Fetching home page ${page}...`);

        const response = await netshortClient.post('/video/shortPlay/base/home/recommend', {
            page: page,
            pageSize: 20
        });

        if (response._encrypted) {
            return {
                success: false,
                encrypted: true,
                message: response._message,
                data: []
            };
        }

        if (response._error) {
            // Try alternative endpoint
            console.log('[NetShort Service] Home endpoint failed, trying category...');
            const altResponse = await netshortClient.post('/video/shortPlay/base/category/list', {
                page: page,
                pageSize: 20
            });

            return normalizeListResponse(altResponse);
        }

        return normalizeListResponse(response);
    } catch (error) {
        console.error('[NetShort Service] getHome error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Search for dramas
 */
export async function search(keyword, page = 1) {
    try {
        console.log(`[NetShort Service] Searching for "${keyword}" page ${page}...`);

        const response = await netshortClient.post('/video/shortPlay/base/search', {
            keyword: keyword,
            page: page,
            pageSize: 20
        });

        return normalizeListResponse(response);
    } catch (error) {
        console.error('[NetShort Service] search error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get drama detail by ID
 */
export async function getDetail(dramaId) {
    try {
        console.log(`[NetShort Service] Fetching detail for drama ${dramaId}...`);

        const response = await netshortClient.post('/video/shortPlay/base/detail', {
            dramaId: String(dramaId)
        });

        return normalizeDetailResponse(response);
    } catch (error) {
        console.error('[NetShort Service] getDetail error:', error.message);
        return { success: false, error: error.message, data: null };
    }
}

/**
 * Get episode list for a drama
 */
export async function getChapters(dramaId, page = 1) {
    try {
        console.log(`[NetShort Service] Fetching episodes for drama ${dramaId} page ${page}...`);

        const response = await netshortClient.post('/video/shortPlay/base/episode/list', {
            dramaId: String(dramaId),
            page: page,
            pageSize: 50
        });

        return normalizeChapterResponse(response);
    } catch (error) {
        console.error('[NetShort Service] getChapters error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get video URL for an episode
 * Uses the intercepted endpoint: /video/shortPlay/base/episode/detail_info
 */
export async function getVideoUrl(dramaId, episodeId) {
    try {
        console.log(`[NetShort Service] Fetching video URL for drama ${dramaId}, episode ${episodeId}...`);

        // Primary endpoint (confirmed from intercept)
        const response = await netshortClient.post('/video/shortPlay/base/episode/detail_info', {
            dramaId: String(dramaId),
            episodeId: String(episodeId)
        });

        return normalizeVideoResponse(response, dramaId, episodeId);
    } catch (error) {
        console.error('[NetShort Service] getVideoUrl error:', error.message);
        return { success: false, error: error.message, data: null };
    }
}

/**
 * Get play history
 * Uses the intercepted endpoint: /user/shortPlay/userBase/last_play_history
 */
export async function getPlayHistory() {
    try {
        console.log('[NetShort Service] Fetching play history...');

        const response = await netshortClient.post('/user/shortPlay/userBase/last_play_history', {});

        if (response._encrypted) {
            return {
                success: false,
                encrypted: true,
                message: response._message,
                data: []
            };
        }

        return {
            success: true,
            data: response.data || response
        };
    } catch (error) {
        console.error('[NetShort Service] getPlayHistory error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

// ============================================
// RESPONSE NORMALIZERS
// ============================================

function normalizeListResponse(response) {
    if (!response) {
        return { success: false, error: 'No response', data: [] };
    }

    if (response._encrypted) {
        return {
            success: false,
            encrypted: true,
            message: response._message,
            rawEncryptKey: response._encryptKey?.substring(0, 50) + '...',
            data: []
        };
    }

    if (response._error) {
        return {
            success: false,
            error: response._message,
            status: response._status,
            data: response._data || []
        };
    }

    // Try to extract data from various response structures
    const code = response.code || response.status;
    const message = response.msg || response.message || '';
    const rawData = response.data || response.result || response.list || [];

    const list = Array.isArray(rawData)
        ? rawData
        : (rawData.list || rawData.items || rawData.records || []);

    return {
        success: code === 200 || code === 0 || !!list.length,
        code,
        message,
        data: list.map(normalizeDrama).filter(Boolean),
        pagination: {
            page: rawData.page || rawData.current || 1,
            hasMore: rawData.hasMore || rawData.has_more || false,
            total: rawData.total || list.length
        }
    };
}

function normalizeDetailResponse(response) {
    if (!response) {
        return { success: false, error: 'No response', data: null };
    }

    if (response._encrypted) {
        return {
            success: false,
            encrypted: true,
            message: response._message,
            data: null
        };
    }

    if (response._error) {
        return {
            success: false,
            error: response._message,
            status: response._status,
            data: response._data
        };
    }

    const code = response.code || response.status;
    const rawData = response.data || response.result || response;

    return {
        success: code === 200 || code === 0,
        code,
        data: normalizeDramaDetail(rawData)
    };
}

function normalizeChapterResponse(response) {
    if (!response) {
        return { success: false, error: 'No response', data: [] };
    }

    if (response._encrypted) {
        return {
            success: false,
            encrypted: true,
            message: response._message,
            data: []
        };
    }

    if (response._error) {
        return {
            success: false,
            error: response._message,
            status: response._status,
            data: response._data || []
        };
    }

    const code = response.code || response.status;
    const rawData = response.data || response.result || response;
    const list = rawData.list || rawData.items || rawData.episodes || [];

    return {
        success: code === 200 || code === 0 || !!list.length,
        code,
        data: Array.isArray(list) ? list.map(normalizeEpisode).filter(Boolean) : [],
        pagination: {
            page: rawData.page || 1,
            hasMore: rawData.hasMore || false,
            total: rawData.total || list.length
        }
    };
}

function normalizeVideoResponse(response, dramaId, episodeId) {
    if (!response) {
        return { success: false, error: 'No response', data: null };
    }

    if (response._encrypted) {
        return {
            success: false,
            encrypted: true,
            message: response._message,
            help: 'The video URL is encrypted. You need the app private key to decrypt it.',
            data: null
        };
    }

    if (response._error) {
        return {
            success: false,
            error: response._message,
            status: response._status,
            data: response._data
        };
    }

    const code = response.code || response.status;
    const rawData = response.data || response.result || response;

    // Extract video URL from various possible locations in the response
    const videoUrl = rawData.videoUrl
        || rawData.video_url
        || rawData.playUrl
        || rawData.play_url
        || rawData.url
        || rawData.streamUrl
        || rawData.stream_url
        || rawData.hlsUrl
        || rawData.hls_url
        || rawData.mp4Url
        || rawData.mp4_url
        || null;

    // Try nested episode data
    const episodeData = rawData.episode || rawData.episodeInfo || rawData.detail || {};
    const nestedVideoUrl = episodeData.videoUrl
        || episodeData.video_url
        || episodeData.playUrl
        || episodeData.play_url
        || null;

    const finalVideoUrl = videoUrl || nestedVideoUrl;

    return {
        success: !!finalVideoUrl || (code === 200 || code === 0),
        code,
        data: {
            dramaId: dramaId,
            episodeId: episodeId,
            videoUrl: finalVideoUrl,
            title: rawData.title || rawData.name || episodeData.title || '',
            duration: rawData.duration || episodeData.duration || 0,
            isVip: rawData.isVip || rawData.is_vip || rawData.vip || false,
            cover: rawData.cover || rawData.coverUrl || '',
            // Include raw response for debugging
            _raw: finalVideoUrl ? undefined : rawData
        }
    };
}

// ============================================
// DATA NORMALIZERS
// ============================================

function normalizeDrama(item) {
    if (!item) return null;

    return {
        id: item.id || item.dramaId || item.drama_id || '',
        title: item.title || item.name || item.dramaName || '',
        cover: item.cover || item.coverUrl || item.cover_url || item.poster || '',
        description: item.description || item.desc || item.synopsis || '',
        episodeCount: item.episodeCount || item.episode_count || item.totalEpisodes || 0,
        category: item.category || item.categoryName || item.genre || '',
        tags: item.tags || item.tagList || [],
        score: item.score || item.rating || 0,
        status: item.status || '',
        updateTime: item.updateTime || item.update_time || ''
    };
}

function normalizeDramaDetail(item) {
    if (!item) return null;

    const episodes = item.episodes || item.episodeList || item.episode_list || [];

    return {
        id: item.id || item.dramaId || '',
        title: item.title || item.name || '',
        cover: item.cover || item.coverUrl || '',
        description: item.description || item.desc || item.synopsis || '',
        episodeCount: item.episodeCount || item.episode_count || episodes.length || 0,
        category: item.category || item.categoryName || '',
        tags: item.tags || item.tagList || [],
        score: item.score || item.rating || 0,
        status: item.status || '',
        author: item.author || item.authorName || '',
        episodes: episodes.map(normalizeEpisode).filter(Boolean)
    };
}

function normalizeEpisode(ep) {
    if (!ep) return null;

    return {
        id: ep.id || ep.episodeId || ep.episode_id || '',
        index: ep.index || ep.episodeIndex || ep.sort || ep.order || 0,
        title: ep.title || ep.name || `Episode ${ep.index || ep.sort || ''}`,
        cover: ep.cover || ep.coverUrl || '',
        duration: ep.duration || 0,
        isVip: ep.isVip || ep.is_vip || ep.vip || !ep.free || false,
        videoUrl: ep.videoUrl || ep.video_url || ep.playUrl || ep.play_url || null,
        updateTime: ep.updateTime || ep.update_time || ''
    };
}
