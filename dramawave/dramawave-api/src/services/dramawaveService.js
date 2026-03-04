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
 * Ensure we have authentication before making API calls.
 * Attempts anonymous login once to get a dynamic token (needed for info_v2).
 * Falls back to static pre-captured token if login fails.
 */
let hasAttemptedDynamicLogin = false;
async function ensureAuthenticated() {
    if (!hasAttemptedDynamicLogin) {
        hasAttemptedDynamicLogin = true;
        console.log('[DramaWaveService] Attempting fresh anonymous login for dynamic token...');
        try {
            const result = await dramawaveClient.anonymousLogin();
            if (result.success) {
                console.log('[DramaWaveService] Dynamic token obtained successfully');
            } else {
                console.log('[DramaWaveService] Dynamic login failed, using static token:', result.error);
            }
        } catch (err) {
            console.log('[DramaWaveService] Dynamic login error, using static token:', err.message);
        }
    }
    // Ensure we have at least the static token
    if (!dramawaveClient.isAuthenticated()) {
        throw new Error('No authentication token available');
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
 * Multi-strategy fallback:
 * 1. Check episode index cache (fastest)
 * 2. Fetch episode list from native /drama/info_v2 API
 * 3. Use currentEpisode from detail (episode 1 only)
 */
async function playEpisodeByIndex(seriesId, episodeIndex = 1) {
    await ensureAuthenticated();
    try {
        // STEP 1: Check episode index cache first (populated by previous calls)
        const cachedEp = dramaCache.getEpisodeByIndex(seriesId, episodeIndex);
        if (cachedEp && cachedEp.videoUrl) {
            console.log(`[DramaWaveService] Cache HIT for episode ${seriesId}:${episodeIndex}`);
            return {
                success: true,
                data: {
                    episodeId: cachedEp.id,
                    episodeIndex: cachedEp.index || episodeIndex,
                    videoUrl: cachedEp.videoUrl,
                    name: cachedEp.name,
                    seriesTitle: cachedEp.seriesTitle || '',
                    duration: cachedEp.duration,
                    subtitles: cachedEp.subtitles || [],
                    source: 'episode_cache'
                }
            };
        }

        // STEP 2: Fetch episode list from native /drama/info_v2 API
        try {
            const infoResponse = await dramawaveClient.get('/drama/info_v2', {
                series_id: seriesId,
                scene: 'for_you'
            }).catch((err) => {
                console.error(`[DramaWaveService] info_v2 request thrown for ${seriesId}:`, err.message);
                if (err.response?.data) console.error(`[DramaWaveService] info_v2 error data:`, err.response.data);
                return null;
            });

            if (infoResponse) {
                console.log(`[DramaWaveService] info_v2 response keys for ${seriesId}:`, Object.keys(infoResponse));
                if (infoResponse.data) {
                    console.log(`[DramaWaveService] info_v2 response.data keys:`, Object.keys(infoResponse.data));
                }
            }

            if (infoResponse && (infoResponse.code === 200 || infoResponse.code === 0) && infoResponse.data) {
                const seriesData = infoResponse.data.info || infoResponse.data;
                const episodeList = seriesData.episode_list || seriesData.episodes || seriesData.items || [];
                const seriesTitle = seriesData.title || seriesData.name || '';
                const seriesCover = seriesData.cover || '';

                if (episodeList.length > 0) {
                    console.log(`[DramaWaveService] info_v2 parsed ${episodeList.length} episodes for ${seriesId}`);
                    // Normalize and cache all episodes
                    const normalizedEpisodes = episodeList.map((ep, idx) => ({
                        id: ep.id || '',
                        index: ep.index || idx + 1,
                        name: ep.name || `Episode ${ep.index || idx + 1}`,
                        cover: ep.cover || '',
                        duration: ep.duration || 0,
                        free: ep.free || false,
                        unlock: ep.unlock || false,
                        videoUrl: ep.external_audio_h264_m3u8 || ep.m3u8_url || ep.video_url || '',
                        videoUrlH265: ep.external_audio_h265_m3u8 || '',
                        subtitles: (ep.subtitle_list || []).map(sub => ({
                            language: sub.language || '',
                            url: sub.subtitle_url || sub.url || '',
                            displayName: sub.display_name || sub.language || ''
                        }))
                    }));

                    // Cache all episodes for future lookups
                    dramaCache.cacheEpisodeList(seriesId, seriesTitle, seriesCover, normalizedEpisodes);

                    // Find the requested episode
                    const episode = normalizedEpisodes.find(ep => ep.index === episodeIndex);
                    console.log(`[DramaWaveService] Search for index ${episodeIndex} returned:`, !!episode, 'videoUrl:', !!episode?.videoUrl);
                    if (episode && episode.videoUrl) {
                        return {
                            success: true,
                            data: {
                                episodeId: episode.id,
                                episodeIndex: episode.index,
                                videoUrl: episode.videoUrl,
                                name: episode.name,
                                seriesTitle: seriesTitle,
                                duration: episode.duration,
                                subtitles: episode.subtitles || [],
                                source: 'info_v2'
                            }
                        };
                    }

                    // Episode found but no video URL (locked/VIP)
                    if (episode) {
                        return {
                            success: false,
                            error: `Episode ${episodeIndex} is locked (VIP content)`,
                            data: { episodeId: episode.id, episodeIndex: episode.index, locked: true }
                        };
                    }
                }
            }
        } catch (infoErr) {
            console.log('[DramaWaveService] info_v2 failed:', infoErr.message);
        }

        // STEP 4: Fallback to getDetail (may retrieve from forYou cache)
        const detailResult = await getDetail(seriesId);
        if (detailResult.success && detailResult.data) {
            // Try episodes array from detail
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
                            seriesTitle: detailResult.data.title,
                            source: 'detail_episodes'
                        }
                    };
                }
            }

            // Last resort: use currentEpisode (only works for episode 1)
            if (detailResult.data.currentEpisode?.videoUrl && episodeIndex === 1) {
                return {
                    success: true,
                    data: {
                        episodeId: detailResult.data.currentEpisode.id,
                        episodeIndex: 1,
                        videoUrl: detailResult.data.currentEpisode.videoUrl,
                        name: detailResult.data.currentEpisode.name,
                        seriesTitle: detailResult.data.title,
                        source: 'currentEpisode'
                    }
                };
            }
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
 * Uses series_id param (confirmed from decompiled Retrofit interface)
 */
async function getEpisodes(seriesId, page = 1, limit = 100) {
    await ensureAuthenticated();

    try {
        // Try /drama/info_v2 with series_id (confirmed from decompiled InterfaceC1148h.java)
        const response = await dramawaveClient.get('/drama/info_v2', {
            series_id: seriesId,
            scene: 'for_you'
        });

        if (response && (response.code === 200 || response.code === 0) && response.data) {
            const data = response.data.info || response.data;
            const episodeList = data.episode_list || data.episodes || data.items || [];

            if (episodeList.length > 0) {
                const normalizedEpisodes = episodeList.map(normalizeEpisode).filter(ep => ep !== null);
                const seriesTitle = data.title || data.name || '';
                const seriesCover = data.cover || '';

                // Cache all episodes for future lookups
                dramaCache.cacheEpisodeList(seriesId, seriesTitle, seriesCover, normalizedEpisodes);

                return {
                    success: true,
                    data: normalizedEpisodes,
                    pagination: {
                        page: page,
                        hasMore: false,
                        total: normalizedEpisodes.length
                    },
                    source: 'info_v2'
                };
            }
        }

        // Fallback: check if we have episodes in the drama cache
        const cached = dramaCache.getDrama(seriesId);
        if (cached && cached.episodes && cached.episodes.length > 0) {
            return {
                success: true,
                data: cached.episodes,
                pagination: {
                    page: 1,
                    hasMore: false,
                    total: cached.episodes.length
                },
                source: 'cache'
            };
        }

        // Fallback: if only currentEpisode available, return that
        if (cached && cached.currentEpisode) {
            return {
                success: true,
                data: [{
                    id: cached.currentEpisode.id,
                    index: cached.currentEpisode.index || 1,
                    name: cached.currentEpisode.name || 'Episode 1',
                    cover: cached.currentEpisode.cover || '',
                    duration: cached.currentEpisode.duration || 0,
                    free: true,
                    unlock: true,
                    videoUrl: cached.currentEpisode.videoUrl || '',
                    hasVideo: !!cached.currentEpisode.videoUrl
                }],
                pagination: {
                    page: 1,
                    hasMore: true,
                    total: cached.episodeCount || 1
                },
                source: 'cache_current_only',
                note: 'Only episode 1 available via cache. Full episode list requires API access.'
            };
        }

        return {
            success: false,
            error: `No episodes found for series ${seriesId}. Try fetching /foryou first.`,
            data: []
        };
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
    const container = series.container || {};
    const episodeInfo = container.episode_info || {};
    const nextEpisode = container.next_episode || null;

    // Build currentEpisode from episode_info
    const currentEpisode = episodeInfo.id ? {
        id: episodeInfo.id,
        name: episodeInfo.name || '',
        cover: episodeInfo.cover || '',
        videoUrl: episodeInfo.external_audio_h264_m3u8 || episodeInfo.m3u8_url || episodeInfo.video_url || '',
        videoUrlH265: episodeInfo.external_audio_h265_m3u8 || '',
        duration: episodeInfo.duration || 0,
        index: episodeInfo.index || 1
    } : null;

    // Build episodes array from available container data
    const episodes = [];
    if (currentEpisode) {
        episodes.push(currentEpisode);
    }
    if (nextEpisode && nextEpisode.id) {
        episodes.push({
            id: nextEpisode.id,
            name: nextEpisode.name || '',
            cover: nextEpisode.cover || '',
            videoUrl: nextEpisode.external_audio_h264_m3u8 || nextEpisode.m3u8_url || nextEpisode.video_url || '',
            videoUrlH265: nextEpisode.external_audio_h265_m3u8 || '',
            duration: nextEpisode.duration || 0,
            index: nextEpisode.index || 2
        });
    }

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
        // Current episode info
        currentEpisode,
        // All available episodes (ep1 + ep2 from container)
        episodes: episodes.length > 0 ? episodes : undefined
    };
}

/**
 * Normalize Episode object
 * Extracts video URLs from multiple possible fields
 */
function normalizeEpisode(episode, idx = undefined) {
    if (!episode) return null;

    const videoUrl = episode.external_audio_h264_m3u8 || episode.m3u8_url || episode.video_url || '';
    const index = episode.index || (idx !== undefined ? idx + 1 : 0);

    return {
        id: episode.id || '',
        index: index,
        name: episode.name || `Episode ${index}`,
        cover: episode.cover || '',
        duration: episode.duration || 0,
        free: episode.free || false,
        unlock: episode.unlock || false,
        price: episode.episode_price || 0,
        videoUrl: videoUrl,
        videoUrlH265: episode.external_audio_h265_m3u8 || '',
        hasVideo: !!videoUrl,
        subtitles: (episode.subtitle_list || []).map(sub => ({
            language: sub.language || '',
            url: sub.subtitle_url || sub.url || '',
            displayName: sub.display_name || sub.language || ''
        }))
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

