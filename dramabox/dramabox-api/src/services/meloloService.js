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
 * Note: The API expects item_id (episode ID) not book_id
 * item_id can be found in the directory info response
 */
async function getVideoModel(itemId, contentType = 1) {
    // Try sending as query parameter first (matches intercepted traffic pattern)
    const queryParams = {
        item_id: itemId.toString(),
        content_type: contentType.toString()
    };

    // Also include in body for compatibility
    const body = {
        item_id: itemId.toString(),
        content_type: contentType
    };

    const response = await meloloClient.post('/novel/player/video_model/v1/', body, queryParams);

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

    // Also try alternative: if response has main_url directly
    if (response.data?.main_url) {
        response.data.directVideoUrl = response.data.main_url;
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
 * Get drama detail with video list (like Sansekai API)
 * Proxies to Sansekai API for reliable signature generation
 */
async function getDetail(seriesId) {
    const axios = (await import('axios')).default;

    try {
        console.log(`[Melolo] Proxying detail request for seriesId: ${seriesId}`);

        // Proxy to Sansekai API which has working signature generation
        const response = await axios.get(`https://api.sansekai.my.id/api/melolo/detail`, {
            params: { bookId: seriesId },
            timeout: 30000
        });

        // Sansekai API returns the data directly
        if (response.data && (response.data.code === 0 || response.data.data?.video_data)) {
            return response.data;
        }

        // If Sansekai returns error, throw to try fallback
        throw new Error(response.data?.message || 'Sansekai returned error');
    } catch (error) {
        console.error('[Melolo Service] Sansekai proxy failed:', error.message);

        // Fallback: try direct API call (may fail due to signature)
        try {
            const body = {
                series_id: seriesId.toString(),
                content_type: 1
            };

            const directResponse = await meloloClient.post('/novel/player/video_detail/v1/', body);
            if (directResponse.code === 0) {
                return directResponse;
            }

            // Return error response
            return {
                success: false,
                message: 'Both Sansekai proxy and direct API failed',
                error: error.message,
                data: directResponse
            };
        } catch (directError) {
            console.error('[Melolo Service] Direct API also failed:', directError.message);
            throw error;
        }
    }
}

/**
 * Get video stream URL with fallback chain
 * 1. Primary: Sansekai API
 * 2. Backup: Python Signature Server (melolo-signature-server.vercel.app)
 * 3. Error message
 * 
 * @param {string} videoId - Video ID (vid from detail response)
 * @returns {object} Stream data with main_url, backup_url, expire_time
 */
async function getStream(videoId) {
    const axios = (await import('axios')).default;
    const sources = [];

    // ============================================
    // PRIMARY: Sansekai API
    // ============================================
    try {
        console.log(`[Melolo] [1/2] Trying Sansekai API for videoId: ${videoId}`);

        const response = await axios.get(`https://api.sansekai.my.id/api/melolo/stream`, {
            params: { videoId },
            timeout: 15000
        });

        if (response.data && (response.data.data?.main_url || response.data.main_url)) {
            console.log(`[Melolo] Sansekai API success`);
            return {
                ...response.data,
                source: 'sansekai'
            };
        }
        sources.push({ name: 'sansekai', error: 'No main_url in response' });
    } catch (error) {
        console.error('[Melolo] Sansekai failed:', error.message);
        sources.push({ name: 'sansekai', error: error.message });
    }

    // ============================================
    // BACKUP: Python Signature Server
    // ============================================
    try {
        console.log(`[Melolo] [2/2] Trying Python Signature Server for videoId: ${videoId}`);

        // Get fresh signatures
        const signUrl = `/novel/player/video_model/v1/?item_id=${videoId}&aid=645713`;
        const signResponse = await axios.post('https://melolo-signature-server.vercel.app/api/sign', {
            url: signUrl,
            device_id: '7588647109784749575',
            install_id: '7588654318736475654',
            app_id: '645713'
        }, { timeout: 10000 });

        if (signResponse.data.success && signResponse.data.headers) {
            const headers = signResponse.data.headers;

            // Make actual request to Melolo API with signatures
            const apiUrl = `https://api16-normal-useast5.tiktokv.us${signUrl}&device_id=7588647109784749575&iid=7588654318736475654`;

            const videoResponse = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'com.fiction.melolovideo/10904 (Linux; U; Android 14; en_US; sdk_gphone64_arm64; Build/UP1A.231005.007)',
                    'Accept': 'application/json',
                    ...headers
                },
                timeout: 15000
            });

            if (videoResponse.data && videoResponse.data.data) {
                console.log(`[Melolo] Python Signature Server success`);
                return {
                    success: true,
                    data: videoResponse.data.data,
                    source: 'python-signature-server'
                };
            }
            sources.push({ name: 'python-signature', error: 'No video data in response' });
        }
    } catch (error) {
        console.error('[Melolo] Python Signature Server failed:', error.message);
        sources.push({ name: 'python-signature', error: error.message });
    }

    // ============================================
    // ALL SOURCES FAILED
    // ============================================
    console.error('[Melolo] All stream sources failed');
    return {
        success: false,
        message: 'All stream sources failed',
        sources: sources,
        note: 'Video streaming requires ByteDance signature which is generated in native code'
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

