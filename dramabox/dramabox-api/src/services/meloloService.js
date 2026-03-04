/**
 * ========================================
 * Melolo Service
 * ========================================
 * 
 * Service layer for Melolo API operations.
 * Handles business logic and data transformation.
 * 
 * API Endpoints:
 * - /i18n_novel/bookmall/tab/v1/ - Homepage tabs
 * - /i18n_novel/book/books/detail/ - Book details
 * - /i18n_novel/search/page/v1/ - Search
 * - /novel/player/video_model/v1/ - Video URLs
 * - /novel/player/video_detail/v1/ - Video details
 */

import * as meloloClient from '../lib/meloloClient.js';

/**
 * Get book mall homepage (tabs and content)
 * @param {string} lang - Language code (default: 'id')
 */
async function getHomePage(lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/bookmall/tab/v1/', {
        tab_id: '0',
        refresh_count: '0'
    }, lang);
    return response;
}

/**
 * Get book mall homepage from CDN
 */
async function getHomePageCDN() {
    const response = await meloloClient.get('/i18n_novel_cdn/bookmall/tab/v1/', {
        tab_id: '0',
        refresh_count: '0'
    });
    return response;
}

/**
 * Get cell change data (for more content in a category)
 */
async function getCellChange(cellId, cursor = '') {
    const response = await meloloClient.get('/i18n_novel/bookmall/cell/change/v1/', {
        cell_id: cellId,
        cursor: cursor
    });
    return response;
}

/**
 * Get common plan (categories)
 */
async function getCommonPlan() {
    const response = await meloloClient.get('/i18n_novel/bookmall/plan/v1/', {});
    return response;
}

/**
 * Get book/series details
 */
async function getBookDetail(bookId) {
    const response = await meloloClient.get('/i18n_novel/book/books/detail/', {
        book_id: bookId
    });
    return response;
}

/**
 * Get book landing page info
 */
async function getBookLandPageInfo(bookId) {
    const response = await meloloClient.get('/i18n_novel/book/land_page_info/v1/', {
        book_id: bookId
    });
    return response;
}

/**
 * Get directory info (episodes/chapters list)
 */
async function getDirectoryInfo(bookId, cursor = '') {
    const response = await meloloClient.get('/i18n_novel/book/directory/info/v1/', {
        book_id: bookId,
        cursor: cursor
    });
    return response;
}

/**
 * Get category list
 */
async function getCategoryList() {
    const response = await meloloClient.get('/i18n_novel/book/category/list/v1/', {});
    return response;
}

/**
 * Search for dramas/series
 */
async function search(keyword, cursor = '', lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/search/page/v1/', {
        query: keyword,
        cursor: cursor
    }, lang);
    return response;
}

/**
 * Get search front page (popular searches, etc.)
 */
async function getSearchFrontPage() {
    const response = await meloloClient.get('/i18n_novel/search/front_page/v1/', {});
    return response;
}

/**
 * Get search suggestions
 */
async function getSearchSuggestions(keyword) {
    const response = await meloloClient.get('/i18n_novel/search/suggest/v1/', {
        keyword: keyword
    });
    return response;
}

/**
 * Get video detail for a series
 */
async function getVideoDetail(seriesId) {
    const body = {
        series_id: seriesId.toString(),
        content_type: 1
    };

    const response = await meloloClient.post('/novel/player/video_detail/v1/', body);
    return response;
}

/**
 * Get video model (stream URLs)
 * This is the main endpoint to get playable video URLs
 * 
 * Note: The API expects video_id (the vid from video_detail response)
 * NOT item_id — confirmed via APK reverse engineering
 */
async function getVideoModel(videoId, contentType = 1) {
    // Use video_id as query parameter (confirmed working via APK RE)
    const queryParams = {
        video_id: videoId.toString(),
        content_type: contentType.toString()
    };

    const response = await meloloClient.get('/novel/player/video_model/v1/', queryParams);

    // Process response to decode video URLs
    if (response.data?.video_model) {
        try {
            const videoModel = JSON.parse(response.data.video_model);
            response.data.parsedVideoModel = videoModel;

            // Decode video URLs from base64
            if (videoModel.video_list) {
                for (const [quality, video] of Object.entries(videoModel.video_list)) {
                    if (video.main_url) {
                        video.decoded_main_url = meloloClient.decodeBase64Url(video.main_url);
                    }
                    if (video.backup_url_1) {
                        video.decoded_backup_url = meloloClient.decodeBase64Url(video.backup_url_1);
                    }
                }
            }
        } catch (e) {
            console.error('[Melolo Service] Failed to parse video_model:', e.message);
        }
    }

    // Also handle direct main_url at response data level
    if (response.data?.main_url) {
        // main_url at data level may already be decoded or base64
        try {
            const decoded = meloloClient.decodeBase64Url(response.data.main_url);
            if (decoded && decoded.startsWith('http')) {
                response.data.directVideoUrl = decoded;
            } else {
                response.data.directVideoUrl = response.data.main_url;
            }
        } catch {
            response.data.directVideoUrl = response.data.main_url;
        }
    }

    return response;
}

/**
 * Get multiple video details
 */
async function getMultiVideoDetail(seriesIds) {
    const body = {
        series_ids: Array.isArray(seriesIds) ? seriesIds.map(String) : [seriesIds.toString()],
        content_type: 1
    };

    const response = await meloloClient.post('/novel/player/multi_video_detail/v1/', body);
    return response;
}

/**
 * Get user read history
 */
async function getReadHistory(cursor = '') {
    const response = await meloloClient.get('/i18n_novel/reader/history/list/v1/', {
        cursor: cursor
    });
    return response;
}

/**
 * Get book read history
 */
async function getBookReadHistory(bookId) {
    const response = await meloloClient.get('/i18n_novel/reader/book_history/list/v1/', {
        book_id: bookId
    });
    return response;
}

/**
 * Get user bookshelf
 */
async function getBookshelf() {
    const response = await meloloClient.get('/i18n_novel/book/bookshelf/list/v1/', {});
    return response;
}

/**
 * Get all episodes with video URLs for a series
 * Uses land_page_info endpoint which returns video_list with vid for each episode
 */
async function getAllEpisodesWithVideo(seriesId) {
    // Get detail which includes video_list with vid for each episode
    const detailResponse = await getDetail(seriesId);

    // Extract video_data from response
    const videoData = detailResponse?.data?.video_data || detailResponse?.video_data || {};
    const videoList = videoData.video_list || [];
    const lockData = detailResponse?.data?.lock_data || detailResponse?.lock_data || {};

    // Process episodes from video_list
    const processedEpisodes = videoList.map((video, index) => {
        return {
            vid: video.vid,
            vid_index: video.vid_index || index + 1,
            series_id: video.series_id || seriesId,
            title: video.title,
            cover: video.cover || video.episode_cover,
            episode_cover: video.episode_cover,
            duration: video.duration,
            content_type: video.content_type || 1,
            digged_count: video.digged_count || 0,
            comment_count: video.comment_count || 0,
            user_digg: video.user_digg || false,
            disable_play: video.disable_play || false,
            vertical: video.vertical !== false,
            disclaimer_info: video.disclaimer_info,
            episodeNumber: video.vid_index || index + 1,
            isLocked: video.disable_play || false,
            isFree: !video.disable_play
        };
    });

    return {
        success: true,
        data: {
            series_id: seriesId,
            series_id_str: videoData.series_id_str || seriesId.toString(),
            series_title: videoData.series_title,
            series_intro: videoData.series_intro,
            series_cover: videoData.series_cover,
            episode_cnt: videoData.episode_cnt || processedEpisodes.length,
            episodes: processedEpisodes,
            lock_data: lockData,
            totalEpisodes: processedEpisodes.length
        }
    };
}

/**
 * Get ranking/trending content
 * @param {string} lang - Language code (default: 'id')
 */
async function getRanking(lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/bookmall/tab/v1/', {
        tab_id: '1',  // Assuming tab_id 1 is ranking
        refresh_count: '0'
    }, lang);
    return response;
}

/**
 * Get For You recommendations
 * @param {string} lang - Language code (default: 'id')
 */
async function getForYou(lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/bookmall/tab/v1/', {
        tab_id: '0',
        refresh_count: '0'
    }, lang);
    return response;
}

/**
 * Get latest dramas
 * @param {string} lang - Language code (default: 'id')
 */
async function getLatest(lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/bookmall/tab/v1/', {
        tab_id: '2',  // tab_id 2 for latest
        refresh_count: '0'
    }, lang);
    return response;
}

/**
 * Get trending dramas
 * @param {string} lang - Language code (default: 'id')
 */
async function getTrending(lang = 'id') {
    const response = await meloloClient.get('/i18n_novel/bookmall/tab/v1/', {
        tab_id: '1',
        refresh_count: '0'
    }, lang);
    return response;
}

/**
 * Get drama detail with video list
 * Priority:
 *   1. Direct API call via meloloClient (self-signed)
 *   2. Local Python Signature Server (better signatures)
 * 
 * NO external dependency on Sansekai API
 */
async function getDetail(seriesId) {
    const axios = (await import('axios')).default;
    const sources = [];

    // ============================================
    // 1. DIRECT API (self-signed via meloloClient)
    // ============================================
    try {
        console.log(`[Melolo] [1/2] Trying direct API for detail seriesId: ${seriesId}`);

        const body = {
            series_id: seriesId.toString(),
            content_type: 1
        };

        const directResponse = await meloloClient.post('/novel/player/video_detail/v1/', body);
        if (directResponse && (directResponse.code === 0 || directResponse.data?.video_data)) {
            console.log(`[Melolo] Direct API detail success`);
            return directResponse;
        }
        sources.push({ name: 'direct', error: `code=${directResponse?.code}, msg=${directResponse?.message}` });
    } catch (error) {
        console.error('[Melolo] Direct API detail failed:', error.message);
        sources.push({ name: 'direct', error: error.message });
    }

    // ============================================
    // 2. LOCAL SIGNATURE SERVER
    // ============================================
    const SIG_SERVER_URL = process.env.MELOLO_SIG_SERVER || 'https://melolo-signature-server.vercel.app';

    try {
        console.log(`[Melolo] [2/2] Trying signature server for detail seriesId: ${seriesId}`);

        const response = await axios.get(`${SIG_SERVER_URL}/api/detail`, {
            params: { seriesId },
            timeout: 30000
        });

        if (response.data?.success && response.data?.data) {
            const result = response.data.data;
            if (result.code === 0 || result.data?.video_data) {
                console.log(`[Melolo] Signature server detail success`);
                return result;
            }
        }
        sources.push({ name: 'signature-server', error: response.data?.error || 'No valid detail data' });
    } catch (error) {
        console.error('[Melolo] Signature server detail failed:', error.message);
        sources.push({ name: 'signature-server', error: error.message });
    }

    // ============================================
    // ALL SOURCES FAILED
    // ============================================
    console.error('[Melolo] All detail sources failed:', JSON.stringify(sources));
    return {
        success: false,
        message: 'All detail sources failed',
        sources
    };
}

/**
 * Get video stream URL with fallback chain
 * Priority:
 *   1. Direct API call via meloloClient (self-signed video_model endpoint)
 *   2. Local Python Signature Server (better native-like signatures)
 * 
 * NO external dependency on Sansekai API
 * 
 * @param {string} videoId - Video ID (vid from detail response)
 * @returns {object} Stream data with main_url, backup_url, expire_time
 */
async function getStream(videoId) {
    const axios = (await import('axios')).default;
    const sources = [];

    // ============================================
    // 1. DIRECT API (self-signed via meloloClient)
    // ============================================
    try {
        console.log(`[Melolo] [1/2] Trying direct API for stream videoId: ${videoId}`);

        const response = await getVideoModel(videoId);

        // Check if we got decoded video URLs
        const parsedModel = response?.data?.parsedVideoModel;
        if (parsedModel?.video_list) {
            // Find best quality decoded URL
            const qualities = ['video_4', 'video_3', 'video_2', 'video_1'];
            for (const q of qualities) {
                const video = parsedModel.video_list[q];
                if (video?.decoded_main_url) {
                    console.log(`[Melolo] Direct API stream success (quality: ${q})`);
                    return {
                        success: true,
                        data: {
                            main_url: video.decoded_main_url,
                            backup_url: video.decoded_backup_url || null,
                            expire_time: response.data?.expire_time,
                            quality: q,
                            video_model: parsedModel
                        },
                        source: 'direct-api'
                    };
                }
            }
        }

        // Check direct main_url
        if (response?.data?.main_url) {
            console.log(`[Melolo] Direct API stream success (direct main_url)`);
            return {
                success: true,
                data: {
                    main_url: response.data.main_url,
                    backup_url: response.data.backup_url_1 || null,
                    expire_time: response.data.expire_time
                },
                source: 'direct-api'
            };
        }

        sources.push({ name: 'direct', error: 'No video URL in response', responseCode: response?.code });
    } catch (error) {
        console.error('[Melolo] Direct API stream failed:', error.message);
        sources.push({ name: 'direct', error: error.message });
    }

    // ============================================
    // 2. LOCAL SIGNATURE SERVER
    // ============================================
    const SIG_SERVER_URL = process.env.MELOLO_SIG_SERVER || 'https://melolo-signature-server.vercel.app';

    try {
        console.log(`[Melolo] [2/2] Trying signature server for stream videoId: ${videoId}`);

        const response = await axios.get(`${SIG_SERVER_URL}/api/stream`, {
            params: { videoId },
            timeout: 30000
        });

        if (response.data?.success && response.data?.data) {
            const streamData = response.data.data;
            if (streamData.main_url) {
                console.log(`[Melolo] Signature server stream success`);
                return {
                    success: true,
                    data: streamData,
                    source: 'python-signature-server'
                };
            }
        }
        sources.push({ name: 'signature-server', error: response.data?.error || 'No main_url in response' });
    } catch (error) {
        console.error('[Melolo] Signature server stream failed:', error.message);
        sources.push({ name: 'signature-server', error: error.message });
    }

    // ============================================
    // ALL SOURCES FAILED
    // ============================================
    console.error('[Melolo] All stream sources failed:', JSON.stringify(sources));
    return {
        success: false,
        message: 'All stream sources failed',
        sources,
        note: 'Video streaming requires valid ByteDance signatures. Try deploying melolo-signature-server with updated parameters.'
    };
}

export {
    getHomePage,
    getHomePageCDN,
    getCellChange,
    getCommonPlan,
    getBookDetail,
    getBookLandPageInfo,
    getDirectoryInfo,
    getCategoryList,
    search,
    getSearchFrontPage,
    getSearchSuggestions,
    getVideoDetail,
    getVideoModel,
    getMultiVideoDetail,
    getReadHistory,
    getBookReadHistory,
    getBookshelf,
    getAllEpisodesWithVideo,
    getRanking,
    getForYou,
    getLatest,
    getTrending,
    getDetail,
    getStream
};

