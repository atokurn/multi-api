/**
 * ========================================
 * DramaWave Service
 * ========================================
 * 
 * Business logic for DramaWave API operations.
 * Handles home feed, drama details, episodes, and video streams.
 * 
 * Based on reverse engineering of DramaWave APK.
 */

import * as dramawaveClient from '../lib/dramawaveClient.js';
import * as dramaCache from '../lib/dramaCache.js';

/**
 * Ensure we have authentication before making API calls
 */
async function ensureAuthenticated() {
    if (!dramawaveClient.isAuthenticated()) {
        const result = await dramawaveClient.anonymousLogin();
        if (!result.success) {
            throw new Error(`Authentication failed: ${result.error}`);
        }
    }
}

/**
 * Get home feed data
 * Fallback to ForYou since homepage endpoints are unstable
 */
async function getHome() {
    return getForYou();
}

/**
 * Get For You recommendations
 * Also caches all data for later detail/stream lookups
 */
async function getForYou(page = 1, limit = 20) {
    await ensureAuthenticated();

    try {
        const response = await dramawaveClient.get('/foryou/feed', {
            page,
            page_size: limit
        });
        const result = normalizeListResponse(response);

        // Cache all dramas for later lookup (detail/stream)
        if (result.success && result.data) {
            dramaCache.cacheDramas(result.data);
        }

        return result;
    } catch (error) {
        console.error('[DramaWaveService] getForYou failed:', error.message);
        throw error;
    }
}

/**
 * Get trending/hot dramas
 * Fallback to ForYou
 */
async function getTrending(page = 1, limit = 20) {
    return getForYou(page, limit);
}

/**
 * Get ranking list
 * Fallback to ForYou
 */
async function getRanking(page = 1, limit = 20) {
    return getForYou(page, limit);
}

// ============================================
// NEW CATEGORY FEED ENDPOINTS
// Based on sapimu.au DramaWave API reference
// ============================================

/**
 * Get new releases
 * Uses ForYou feed filtered by upload date
 */
async function getNewReleases(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        // Try homepage rank with 'new' type if available, fallback to foryou
        const response = await dramawaveClient.post('/homepage/v2/rank', {
            key: 'new'
        }).catch(() => null);

        if (response && (response.code === 200 || response.code === 0) && response.data) {
            return normalizeListResponse(response);
        }
        return getForYou(page, limit);
    } catch (error) {
        console.error('[DramaWaveService] getNewReleases failed:', error.message);
        return getForYou(page, limit);
    }
}

/**
 * Get free dramas (non-VIP content)
 */
async function getFreeDramas(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        const forYouResult = await getForYou(page, 50);
        if (forYouResult.success && forYouResult.data) {
            // Filter for free content (free=true or vipType=0)
            const freeContent = forYouResult.data.filter(d => d.free || d.vipType === 0);
            return {
                success: true,
                data: freeContent.slice(0, limit),
                pagination: { hasMore: freeContent.length > limit }
            };
        }
        return forYouResult;
    } catch (error) {
        console.error('[DramaWaveService] getFreeDramas failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get VIP exclusive dramas
 */
async function getVipDramas(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        // Try vip_series endpoint
        const response = await dramawaveClient.post('/homepage/vip_series', {})
            .catch(() => null);

        if (response && (response.code === 200 || response.code === 0) && response.data) {
            return normalizeListResponse(response);
        }

        // Fallback: filter ForYou for VIP content
        const forYouResult = await getForYou(page, 50);
        if (forYouResult.success && forYouResult.data) {
            const vipContent = forYouResult.data.filter(d => d.vipType > 0);
            return {
                success: true,
                data: vipContent.slice(0, limit),
                pagination: { hasMore: vipContent.length > limit }
            };
        }
        return forYouResult;
    } catch (error) {
        console.error('[DramaWaveService] getVipDramas failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get dubbed dramas (with voice dubbing)
 */
async function getDubbingDramas(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        // Filter ForYou for dubbed content (check title for dubbing markers)
        const forYouResult = await getForYou(page, 50);
        if (forYouResult.success && forYouResult.data) {
            const dubbingContent = forYouResult.data.filter(d =>
                d.title?.includes('Sulih Suara') ||
                d.title?.includes('Dubbing') ||
                d.title?.includes('Dubbed')
            );
            return {
                success: true,
                data: dubbingContent.length > 0 ? dubbingContent.slice(0, limit) : forYouResult.data.slice(0, limit),
                pagination: { hasMore: dubbingContent.length > limit }
            };
        }
        return forYouResult;
    } catch (error) {
        console.error('[DramaWaveService] getDubbingDramas failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get male audience dramas  
 */
async function getMaleDramas(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        // Search for male-oriented content
        const result = await search('action', page, limit);
        if (result.success && result.data?.length > 0) {
            return result;
        }
        return getForYou(page, limit);
    } catch (error) {
        console.error('[DramaWaveService] getMaleDramas failed:', error.message);
        return getForYou(page, limit);
    }
}

/**
 * Get female audience dramas
 */
async function getFemaleDramas(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        // Search for female-oriented content (romance, ceo)
        const result = await search('romance', page, limit);
        if (result.success && result.data?.length > 0) {
            return result;
        }
        return getForYou(page, limit);
    } catch (error) {
        console.error('[DramaWaveService] getFemaleDramas failed:', error.message);
        return getForYou(page, limit);
    }
}

/**
 * Get coming soon dramas
 */
async function getComingSoon(page = 1, limit = 20) {
    await ensureAuthenticated();
    try {
        const response = await dramawaveClient.get('/coming-soon/list', {
            page,
            page_size: limit
        }).catch(() => null);

        if (response && (response.code === 200 || response.code === 0) && response.data) {
            return normalizeListResponse(response);
        }
        return { success: true, data: [], pagination: { hasMore: false }, message: 'No coming soon dramas' };
    } catch (error) {
        console.error('[DramaWaveService] getComingSoon failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get search hot words (trending keywords)
 */
async function getSearchHot() {
    await ensureAuthenticated();
    try {
        const response = await dramawaveClient.get('/search/hot_words')
            .catch(() => null);

        if (response && (response.code === 200 || response.code === 0) && response.data) {
            const hotWords = response.data?.hot_words || response.data?.list || response.data || [];
            return {
                success: true,
                data: Array.isArray(hotWords) ? hotWords : []
            };
        }
        return { success: true, data: [] };
    } catch (error) {
        console.error('[DramaWaveService] getSearchHot failed:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Play episode by index (1-based)
 * Uses sapimu v2 proxy for full episode list access
 */
async function playEpisodeByIndex(seriesId, episodeIndex = 1) {
    await ensureAuthenticated();
    try {
        // Import sapimu service dynamically to avoid circular dependency
        const sapimuService = await import('./sapimuDramawaveService.js');

        // Use sapimu v2 which has full episode list with video URLs
        const result = await sapimuService.playEpisode(seriesId, episodeIndex);

        if (result.success && result.data) {
            return {
                success: true,
                data: {
                    episodeId: result.data.id,
                    episodeIndex: result.data.index || episodeIndex,
                    videoUrl: result.data.videoUrl,
                    name: result.data.name,
                    seriesTitle: '', // Sapimu doesn't return series title in play response
                    duration: result.data.duration,
                    subtitles: result.data.subtitles || [],
                    source: result.source
                }
            };
        }

        // Fallback to old method if sapimu fails
        const detailResult = await getDetail(seriesId);
        if (!detailResult.success || !detailResult.data) {
            return { success: false, error: result.error || 'Drama not found', data: null };
        }

        // If drama has episodes list, find by index
        const episodes = detailResult.data.episodes || [];
        if (episodes.length >= episodeIndex) {
            const episode = episodes[episodeIndex - 1];
            if (episode?.videoUrl) {
                return {
                    success: true,
                    data: {
                        episodeId: episode.id,
                        episodeIndex: episodeIndex,
                        videoUrl: episode.videoUrl,
                        name: episode.name,
                        seriesTitle: detailResult.data.title
                    }
                };
            }
        }

        // Fallback: return current episode from detail (only episode 1)
        if (detailResult.data.currentEpisode?.videoUrl && episodeIndex === 1) {
            return {
                success: true,
                data: {
                    episodeId: detailResult.data.currentEpisode.id,
                    episodeIndex: 1,
                    videoUrl: detailResult.data.currentEpisode.videoUrl,
                    name: detailResult.data.currentEpisode.name,
                    seriesTitle: detailResult.data.title
                }
            };
        }

        return { success: false, error: `Episode ${episodeIndex} not available`, data: null };
    } catch (error) {
        console.error('[DramaWaveService] playEpisodeByIndex failed:', error.message);
        return { success: false, error: error.message, data: null };
    }
}

/**
 * Search dramas using POST
 * Request body: { keyword, next (pagination token), timestamp }
 */
async function search(keyword, page = 1, limit = 20) {
    await ensureAuthenticated();

    try {
        // Use POST /search/drama with body
        const response = await dramawaveClient.post('/search/drama', {
            keyword: keyword,
            next: page > 1 ? String(page) : null,
            timestamp: String(Date.now())
        }).catch(err => ({
            code: -1,
            msg: err.message,
            data: { list: [] }
        }));

        return normalizeSearchResponse(response);
    } catch (error) {
        console.error('[DramaWaveService] search failed:', error.message);
        return { success: true, data: [], pagination: { hasMore: false } };
    }
}

/**
 * Get drama detail by ID
 * 1. Checks in-memory cache first (populated by getForYou)
 * 2. Then tries /drama/info_v2 endpoint
 * 3. Falls back to fresh forYou lookup
 * Returns 404 if drama not found anywhere
 */
async function getDetail(seriesId) {
    await ensureAuthenticated();

    try {
        // STEP 1: Check cache first (fastest lookup)
        const cached = dramaCache.getDrama(seriesId);
        if (cached) {
            console.log('[DramaWaveService] Found drama in cache:', cached.title);
            return {
                success: true,
                data: cached,
                source: 'cache'
            };
        }

        // STEP 2: Try with info_v2 endpoint
        const response = await dramawaveClient.get('/drama/info_v2', {
            series_id: seriesId,
            scene: 'for_you'
        }).catch(() => null);

        // Check if we got MEANINGFUL data
        const hasValidData = response &&
            (response.code === 200 || response.code === 0) &&
            response.data &&
            (response.data.title || response.data.key || response.data.name);

        if (hasValidData) {
            const result = normalizeDetailResponse(response);
            // Cache this for later
            if (result.success && result.data) {
                dramaCache.cacheDrama(result.data);
            }
            return { ...result, source: 'api' };
        }

        // STEP 3: Fetch fresh forYou data and search (also populates cache)
        console.log('[DramaWaveService] info_v2 empty, refreshing forYou for:', seriesId);
        const forYouResult = await getForYou(1, 50);

        if (forYouResult.success && forYouResult.data && forYouResult.data.length > 0) {
            const found = forYouResult.data.find(item =>
                item.id === seriesId || item.key === seriesId
            );

            if (found) {
                console.log('[DramaWaveService] Found drama in fresh forYou:', found.title);
                return {
                    success: true,
                    data: found,
                    source: 'foryou'
                };
            }
        }

        // NOT FOUND anywhere
        console.log('[DramaWaveService] Drama not found:', seriesId);
        return {
            success: false,
            error: `Drama with ID '${seriesId}' not found. Try fetching /foryou first to populate cache.`,
            data: null
        };
    } catch (error) {
        console.error('[DramaWaveService] getDetail failed:', error.message);
        return { success: false, error: error.message, data: null };
    }
}

/**
 * Get episode list for a drama
 */
async function getEpisodes(seriesKey, page = 1, limit = 100) {
    await ensureAuthenticated();

    try {
        const response = await dramawaveClient.get('/drama/info_v2', {
            series_key: seriesKey,  // API uses series_key not series_id
            page,
            page_size: limit
        });
        return normalizeEpisodesResponse(response);
    } catch (error) {
        console.error('[DramaWaveService] getEpisodes failed:', error.message);
        throw error;
    }
}

/**
 * Get video stream for an episode
 * 1. Checks episode cache first (populated by getForYou)
 * 2. Tries episode API endpoint
 * 3. Falls back to fresh forYou lookup
 * Returns 404 if episode not found anywhere
 */
async function getVideo(episodeId) {
    await ensureAuthenticated();

    try {
        // STEP 1: Check episode cache first (fastest)
        const cached = dramaCache.getEpisode(episodeId);
        if (cached && cached.videoUrl) {
            console.log('[DramaWaveService] Found episode in cache:', cached.name);
            return {
                success: true,
                data: {
                    episodeId: episodeId,
                    videoUrl: cached.videoUrl,
                    duration: cached.duration,
                    name: cached.name,
                    seriesTitle: cached.seriesTitle
                },
                source: 'cache'
            };
        }

        // STEP 2: Try direct episode endpoint
        const response = await dramawaveClient.get('/drama/episode', {
            episode_id: episodeId
        }).catch(() => null);

        if (response && (response.code === 200 || response.code === 0) && response.data?.video_url) {
            return { ...normalizeVideoResponse(response), source: 'api' };
        }

        // STEP 3: Fetch fresh forYou and search (also populates cache)
        const forYouResult = await getForYou(1, 50);
        if (forYouResult.success && forYouResult.data) {
            for (const drama of forYouResult.data) {
                if (drama.currentEpisode && drama.currentEpisode.id === episodeId) {
                    return {
                        success: true,
                        data: {
                            episodeId: episodeId,
                            videoUrl: drama.currentEpisode.videoUrl,
                            duration: drama.currentEpisode.duration,
                            name: drama.currentEpisode.name,
                            seriesTitle: drama.title
                        },
                        source: 'foryou'
                    };
                }
            }
        }

        // NOT FOUND anywhere
        return {
            success: false,
            error: `Episode with ID '${episodeId}' not found. Try fetching /foryou first to populate cache.`,
            data: null
        };
    } catch (error) {
        console.error('[DramaWaveService] getVideo failed:', error.message);
        return { success: false, error: error.message, data: null };
    }
}

// ============================================
// RESPONSE NORMALIZERS
// ============================================

/**
 * Normalize home feed response
 */
function normalizeHomeResponse(response) {
    if (!response || response.code !== 0) {
        return {
            success: false,
            error: response?.msg || 'Invalid response',
            data: []
        };
    }

    const sections = response.data?.sections || response.data?.list || [];
    return {
        success: true,
        data: sections.map(section => ({
            id: section.id || '',
            title: section.title || section.name || '',
            type: section.type || 'horizontal',
            items: (section.items || section.series || []).map(normalizeSeries)
        }))
    };
}

/**
 * Normalize list response (trending, ranking, search, foryou, etc.)
 * API returns: { code: 0, msg: "ok", data: { list: [...], page_info: {...} } }
 */
function normalizeListResponse(response) {
    // Check for valid response - API uses code:0 or just has data
    const isValid = response && (response.code === 0 || response.data);

    if (!isValid) {
        return {
            success: false,
            error: response?.msg || response?.message || 'Invalid response',
            data: []
        };
    }

    // API returns data.items (not data.list)
    const list = response.data?.items || response.data?.list || response.data || [];
    const pageInfo = response.data?.page_info || {};

    // Normalize each item and filter out nulls
    const normalizedData = Array.isArray(list)
        ? list.map(item => {
            const normalized = normalizeSeries(item);
            // If normalization returns minimal data, include raw key fields
            if (normalized && (!normalized.title && !normalized.id)) {
                // Pass through raw item for debugging
                return { ...normalized, _raw: item };
            }
            return normalized;
        }).filter(item => item !== null)
        : [];

    return {
        success: true,
        data: normalizedData,
        pagination: {
            hasMore: pageInfo.has_more || false,
            next: pageInfo.next || null,
            total: response.data?.total || list.length
        }
    };
}

/**
 * Normalize search response from POST /search/drama
 * Response structure: { code, message, data: { list: [...], next, has_more } }
 */
function normalizeSearchResponse(response) {
    const isValid = response && (response.code === 0 || response.code === 200 || response.data);

    if (!isValid) {
        return {
            success: false,
            error: response?.msg || response?.message || 'Search failed',
            data: [],
            pagination: { hasMore: false }
        };
    }

    // Response may have data.list or data.items or direct data array
    const data = response.data || {};
    const list = data.list || data.items || (Array.isArray(data) ? data : []);

    const normalizedData = Array.isArray(list)
        ? list.map(normalizeSeries).filter(item => item !== null)
        : [];

    return {
        success: true,
        data: normalizedData,
        pagination: {
            hasMore: data.has_more || false,
            next: data.next || null,
            total: normalizedData.length
        }
    };
}

/**
 * Normalize drama detail response
 * API returns code: 200 (success) or code: 0 for some endpoints
 */
function normalizeDetailResponse(response) {
    const isValid = response && (response.code === 0 || response.code === 200 || response.data);

    if (!isValid) {
        return {
            success: false,
            error: response?.msg || response?.message || 'Invalid response',
            data: null
        };
    }

    const series = response.data || {};
    return {
        success: true,
        data: {
            ...normalizeSeries(series),
            episodes: (series.episode_list || series.episodes || []).map(normalizeEpisode)
        }
    };
}

/**
 * Normalize episodes response
 * API returns code: 200 (success) or code: 0 for some endpoints
 * Episode list may be in: data.episode_list, data.items, data.list, or directly in data[]
 */
function normalizeEpisodesResponse(response) {
    // Check for valid response - API uses either code:0, code:200, or just has data
    const isValid = response && (response.code === 0 || response.code === 200 || response.data);

    if (!isValid) {
        return {
            success: false,
            error: response?.msg || response?.message || 'Invalid response',
            data: []
        };
    }

    // Try multiple possible locations for episode list
    const data = response.data || {};
    const episodes = data.episode_list || data.items || data.list || (Array.isArray(data) ? data : []);

    return {
        success: true,
        data: Array.isArray(episodes) ? episodes.map(normalizeEpisode).filter(ep => ep !== null) : [],
        pagination: {
            page: data?.page || 1,
            hasMore: data?.has_more || data?.page_info?.has_more || false,
            total: data?.total || episodes.length
        }
    };
}

/**
 * Normalize video response
 */
function normalizeVideoResponse(response) {
    if (!response || response.code !== 0) {
        return {
            success: false,
            error: response?.msg || 'Invalid response',
            data: null
        };
    }

    const episode = response.data || {};
    return {
        success: true,
        data: {
            id: episode.id || '',
            videoUrl: episode.video_url || '',
            m3u8Url: episode.m3u8_url || '',
            hlsH264: episode.external_audio_h264_m3u8 || '',
            hlsH265: episode.external_audio_h265_m3u8 || '',
            duration: episode.duration || 0,
            subtitles: (episode.subtitle_list || []).map(sub => ({
                language: sub.language || '',
                url: sub.subtitle_url || sub.url || '',
                displayName: sub.display_name || sub.language || ''
            }))
        }
    };
}

/**
 * Normalize Series object
 * API returns: { key, title, cover, desc, episode_count, container: { episode_info, next_episode }, ... }
 */
function normalizeSeries(series) {
    if (!series) return null;

    // Handle both direct series and nested container structure
    const episodeInfo = series.container?.episode_info || {};

    return {
        id: series.id || series.key || '',
        key: series.key || '',
        title: series.title || series.name || '',
        cover: series.cover || episodeInfo.cover || '',
        description: series.desc || series.description || '',
        episodeCount: series.episode_count || 0,
        viewCount: series.view_count || 0,
        followCount: series.follow_count || 0,
        free: series.free ?? false,
        vipType: series.vip_type || 0,
        tags: series.content_tags || series.tag || [],
        rating: series.hot_score || '',
        payIndex: series.pay_index || 0,
        // Current episode info if available
        currentEpisode: episodeInfo.id ? {
            id: episodeInfo.id,
            name: episodeInfo.name || '',
            cover: episodeInfo.cover || '',
            videoUrl: episodeInfo.external_audio_h264_m3u8 || episodeInfo.m3u8_url || '',
            duration: episodeInfo.duration || 0,
            index: episodeInfo.index || 1
        } : null
    };
}

/**
 * Normalize Episode object
 */
function normalizeEpisode(episode) {
    return {
        id: episode.id || '',
        index: episode.index || 0,
        name: episode.name || `Episode ${episode.index || 0}`,
        cover: episode.cover || '',
        duration: episode.duration || 0,
        free: episode.free || false,
        unlock: episode.unlock || false,
        price: episode.episode_price || 0,
        hasVideo: !!(episode.video_url || episode.m3u8_url)
    };
}

export {
    getHome,
    getForYou,
    getTrending,
    getRanking,
    search,
    getDetail,
    getEpisodes,
    getVideo,
    ensureAuthenticated,
    // New endpoints
    getNewReleases,
    getFreeDramas,
    getVipDramas,
    getDubbingDramas,
    getMaleDramas,
    getFemaleDramas,
    getComingSoon,
    getSearchHot,
    playEpisodeByIndex
};

