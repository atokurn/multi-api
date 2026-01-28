/**
 * ========================================
 * Stream Controller
 * ========================================
 * 
 * Unified streaming controller for direct episode access.
 * Supports multiple providers with consistent response format.
 * 
 * Endpoints:
 * - GET /api/stream/:provider/:dramaId/:episodeIndex
 * - GET /api/stream/:provider/:dramaId (all episodes)
 */

import * as dramaboxService from '../services/dramaboxDirectService.js';
import * as flickreelsService from '../services/flickreelsService.js';
import * as meloloService from '../services/meloloService.js';
import * as shortmaxService from '../services/shortmaxService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import {
    isValidProvider,
    isValidLanguage,
    isValidQuality,
    selectBestStream,
    DEFAULT_STREAM_OPTIONS,
    LANGUAGE_LABELS
} from '../lib/types.js';

/**
 * Parse stream options from request query
 * @param {Object} query - Request query parameters
 * @returns {Object} - Parsed stream options
 */
function parseStreamOptions(query) {
    return {
        lang: isValidLanguage(query.lang) ? query.lang : DEFAULT_STREAM_OPTIONS.lang,
        quality: isValidQuality(query.quality)
            ? (query.quality === 'auto' ? 'auto' : parseInt(query.quality))
            : DEFAULT_STREAM_OPTIONS.quality,
        dubbing: query.dubbing || DEFAULT_STREAM_OPTIONS.dubbing,
        format: query.format || DEFAULT_STREAM_OPTIONS.format
    };
}

/**
 * GET /api/stream/:provider/:dramaId/:episodeIndex
 * Get direct stream for a specific episode
 */
async function getStream(req, res) {
    try {
        const { provider, dramaId, episodeIndex } = req.params;
        const options = parseStreamOptions(req.query);

        // Validate provider
        if (!isValidProvider(provider)) {
            return errorResponse(res, `Invalid provider: ${provider}. Valid: dramabox, flickreels, melolo, shortmax`, 400);
        }

        // Validate episode index
        const epIndex = parseInt(episodeIndex);
        if (isNaN(epIndex) || epIndex < 0) {
            return errorResponse(res, 'Invalid episode index', 400);
        }

        let streamData;

        switch (provider) {
            case 'dramabox':
                streamData = await getDramaboxStream(dramaId, epIndex, options);
                break;
            case 'flickreels':
                streamData = await getFlickreelsStream(dramaId, epIndex, options);
                break;
            case 'melolo':
                streamData = await getMeloloStream(dramaId, epIndex, options);
                break;
            case 'shortmax':
                streamData = await getShortmaxStream(dramaId, epIndex, options);
                break;
            default:
                return errorResponse(res, `Provider ${provider} not implemented`, 501);
        }

        // Check if we got valid stream data with a selected stream URL
        if (!streamData || !streamData.episode?.selectedStream) {
            return errorResponse(res, 'Stream not available for this episode', 404);
        }

        return successResponse(res, {
            provider,
            dramaId,
            options,
            ...streamData
        });

    } catch (error) {
        console.error('[StreamController] Error:', error.message);
        return errorResponse(res, error.message, 500);
    }
}

/**
 * GET /api/stream/:provider/:dramaId
 * Get all episodes with stream URLs
 */
async function getAllStreams(req, res) {
    try {
        const { provider, dramaId } = req.params;
        const options = parseStreamOptions(req.query);

        if (!isValidProvider(provider)) {
            return errorResponse(res, `Invalid provider: ${provider}`, 400);
        }

        let episodesData;

        switch (provider) {
            case 'dramabox':
                episodesData = await getDramaboxAllStreams(dramaId, options);
                break;
            case 'flickreels':
                episodesData = await getFlickreelsAllStreams(dramaId, options);
                break;
            case 'melolo':
                episodesData = await getMeloloAllStreams(dramaId, options);
                break;
            case 'shortmax':
                episodesData = await getShortmaxAllStreams(dramaId, options);
                break;
            default:
                return errorResponse(res, `Provider ${provider} not implemented`, 501);
        }

        return successResponse(res, {
            provider,
            dramaId,
            options,
            ...episodesData
        });

    } catch (error) {
        console.error('[StreamController] getAllStreams Error:', error.message);
        return errorResponse(res, error.message, 500);
    }
}

// ============================================
// DRAMABOX STREAM FUNCTIONS
// ============================================

async function getDramaboxStream(bookId, episodeIndex, options) {
    const { lang, quality } = options;

    // Use getWatchVideo for single episode (faster)
    const videoData = await dramaboxService.getWatchVideo(bookId, episodeIndex);

    if (!videoData || !videoData.videoUrl) {
        throw new Error(`Episode ${episodeIndex} not found for DramaBox ${bookId}`);
    }

    // Build streams array from qualities
    const streams = (videoData.qualities || []).map(q => ({
        url: q.videoPath,
        quality: q.quality,
        codec: 'h264',
        isDefault: q.isDefault === 1
    }));

    // If no qualities array, use main videoUrl
    if (streams.length === 0 && videoData.videoUrl) {
        streams.push({
            url: videoData.videoUrl,
            quality: videoData.quality || 720,
            codec: 'h264',
            isDefault: true
        });
    }

    const bestStream = selectBestStream(streams, quality);

    return {
        episode: {
            episodeId: videoData.chapterId,
            episodeIndex: videoData.chapterIndex,
            title: videoData.chapterName || `Episode ${episodeIndex + 1}`,
            duration: videoData.duration || 0,
            cover: videoData.chapterImg,
            streams,
            audioTracks: [], // DramaBox doesn't have separate audio tracks
            subtitles: [],
            selectedStream: bestStream?.url || videoData.videoUrl,
            isVip: false,
            isLocked: false
        },
        dramaTitle: videoData.bookName,
        dramaCover: videoData.bookCover
    };
}

async function getDramaboxAllStreams(bookId, options) {
    const { lang, quality } = options;

    console.log(`[StreamController] Fetching all episodes for DramaBox ${bookId}...`);
    const allEpisodes = await dramaboxService.getAllEpisodesWithVideo(bookId);

    // getAllEpisodesWithVideo returns array directly, not wrapped in {data: ...}
    if (!allEpisodes) {
        throw new Error(`Failed to get episodes for DramaBox ${bookId}`);
    }

    // Handle both array and empty cases
    const episodeList = Array.isArray(allEpisodes) ? allEpisodes : [];
    console.log(`[StreamController] Got ${episodeList.length} episodes for DramaBox ${bookId}`);

    const episodes = episodeList.map((ep, idx) => {
        // Handle pre-formatted data from getAllEpisodesWithVideo
        // allQualities has 'url' property
        const streams = (ep.allQualities || []).map(v => ({
            url: v.url || v.videoPath,
            quality: v.quality,
            codec: 'h264',
            isDefault: false
        }));

        // If no allQualities, use main videoUrl
        if (streams.length === 0 && ep.videoUrl) {
            streams.push({
                url: ep.videoUrl,
                quality: ep.quality || 720,
                codec: 'h264',
                isDefault: true
            });
        }

        const bestStream = selectBestStream(streams, quality);

        return {
            episodeId: ep.chapterId,
            episodeIndex: ep.chapterIndex ?? idx,
            title: ep.chapterName || `Episode ${idx + 1}`,
            duration: ep.duration || 0,
            cover: ep.chapterImg,
            streams,
            selectedStream: bestStream?.url,
            isVip: ep.isVip === true || ep.isVip === 1,
            isLocked: ep.isLocked === true || ep.isLocked === 1
        };
    });

    return {
        totalEpisodes: episodes.length,
        episodes
    };
}

// ============================================
// FLICKREELS STREAM FUNCTIONS
// ============================================

async function getFlickreelsStream(playletId, episodeIndex, options) {
    const { quality } = options;

    // Get all episodes (with VIP bypass)
    const response = await flickreelsService.getAllEpisodesWithVideo(playletId, true);

    // Try different paths to find the list (API returns { data: { list: [...] } })
    let episodeList = response?.data?.list;
    if (!episodeList && Array.isArray(response?.data)) {
        episodeList = response.data;
    }

    if (!episodeList || episodeList.length === 0) {
        throw new Error(`No episodes found for FlickReels ${playletId}`);
    }

    const episode = episodeList[episodeIndex];
    if (!episode) {
        throw new Error(`Episode ${episodeIndex} not found for FlickReels ${playletId}`);
    }

    const streams = [];
    if (episode.videoUrl) {
        streams.push({
            url: episode.videoUrl,
            quality: 720, // FlickReels typically provides 720p
            codec: 'h264',
            isDefault: true
        });
    }

    const bestStream = selectBestStream(streams, quality);

    return {
        episode: {
            episodeId: episode.id,
            episodeIndex: episode.chapter_index || episodeIndex,
            title: episode.title || `Episode ${episodeIndex + 1}`,
            duration: episode.duration || 0,
            cover: episode.cover_url,
            streams,
            audioTracks: [],
            subtitles: [],
            selectedStream: bestStream?.url || episode.videoUrl,
            isVip: episode.isVip,
            isLocked: !episode.hasVideo
        },
        unlockSource: episode.unlockSource
    };
}

async function getFlickreelsAllStreams(playletId, options) {
    const response = await flickreelsService.getAllEpisodesWithVideo(playletId, true);

    // Service returns { data: { list: [...] } } directly
    const episodeList = response?.data?.list;

    if (!episodeList) {
        throw new Error(`Failed to get episodes for FlickReels ${playletId}`);
    }

    const episodes = episodeList.map((ep, idx) => ({
        episodeId: ep.id,
        episodeIndex: ep.chapter_index || idx,
        title: ep.title || `Episode ${idx + 1}`,
        duration: ep.duration || 0,
        cover: ep.cover_url,
        streams: ep.videoUrl ? [{
            url: ep.videoUrl,
            quality: 720,
            codec: 'h264',
            isDefault: true
        }] : [],
        selectedStream: ep.videoUrl,
        isVip: ep.isVip,
        isLocked: !ep.hasVideo,
        unlockSource: ep.unlockSource
    }));

    return {
        totalEpisodes: episodes.length,
        episodes
    };
}

// ============================================
// MELOLO STREAM FUNCTIONS
// ============================================

async function getMeloloStream(seriesId, episodeIndex, options) {
    const { quality } = options;

    // Get detail with video list
    const detail = await meloloService.getDetail(seriesId);

    if (!detail?.data?.video_data?.video_list) {
        throw new Error(`No video list found for Melolo ${seriesId}`);
    }

    const videoList = detail.data.video_data.video_list;
    const episode = videoList[episodeIndex];

    if (!episode) {
        throw new Error(`Episode ${episodeIndex} not found for Melolo ${seriesId}`);
    }

    // Get stream URL for this episode
    const streamData = await meloloService.getStream(episode.vid);

    let streams = [];
    let selectedStream = null;

    if (streamData?.data) {
        // Try to parse video_model for multiple qualities
        if (streamData.data.video_model) {
            try {
                const videoModel = typeof streamData.data.video_model === 'string'
                    ? JSON.parse(streamData.data.video_model)
                    : streamData.data.video_model;

                if (videoModel.video_list) {
                    for (const [key, video] of Object.entries(videoModel.video_list)) {
                        const qualityMatch = key.match(/video_(\d+)/);
                        const q = qualityMatch ? parseInt(qualityMatch[1]) : 720;

                        if (video.decoded_main_url || video.main_url) {
                            streams.push({
                                url: video.decoded_main_url || video.main_url,
                                quality: q,
                                codec: video.codec_type || 'h264',
                                isDefault: false
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('[Melolo] Failed to parse video_model:', e.message);
            }
        }

        // Fallback to main_url
        if (streams.length === 0 && streamData.data.main_url) {
            streams.push({
                url: streamData.data.main_url,
                quality: 720,
                codec: 'h264',
                isDefault: true
            });
        }
    }

    const bestStream = selectBestStream(streams, quality);

    return {
        episode: {
            episodeId: episode.vid,
            episodeIndex: episode.vid_index || episodeIndex,
            title: episode.title || `Episode ${episodeIndex + 1}`,
            duration: episode.duration || 0,
            cover: episode.cover || episode.episode_cover,
            streams,
            audioTracks: [],
            subtitles: [],
            selectedStream: bestStream?.url,
            isVip: episode.disable_play || false,
            isLocked: episode.disable_play || false
        },
        source: streamData?.source
    };
}

async function getMeloloAllStreams(seriesId, options) {
    const detail = await meloloService.getDetail(seriesId);

    if (!detail?.data?.video_data?.video_list) {
        throw new Error(`Failed to get episodes for Melolo ${seriesId}`);
    }

    const videoList = detail.data.video_data.video_list;

    // Note: Getting stream URLs for ALL episodes would be too slow
    // Return episode list with vid for client to request individual streams
    const episodes = videoList.map((ep, idx) => ({
        episodeId: ep.vid,
        episodeIndex: ep.vid_index || idx,
        title: ep.title || `Episode ${idx + 1}`,
        duration: ep.duration || 0,
        cover: ep.cover || ep.episode_cover,
        streams: [], // Client should call /stream/:provider/:id/:index
        selectedStream: null,
        isVip: ep.disable_play || false,
        isLocked: ep.disable_play || false,
        // Include vid for client to request stream
        vid: ep.vid
    }));

    return {
        seriesTitle: detail.data.video_data.series_title,
        totalEpisodes: episodes.length,
        episodes,
        note: 'Call /api/stream/melolo/{seriesId}/{episodeIndex} to get stream URL for each episode'
    };
}

// ============================================
// SHORTMAX STREAM FUNCTIONS
// ============================================

async function getShortmaxStream(shortPlayCode, episodeIndex, options) {
    const { quality } = options;

    // Get detail first to get shortPlayId
    const detail = await shortmaxService.getDetail(shortPlayCode);

    if (!detail) {
        throw new Error(`Drama not found for ShortMax ${shortPlayCode}`);
    }

    // Get chapters
    const chapters = await shortmaxService.getChapters(detail.id);

    if (!chapters?.data || chapters.data.length === 0) {
        throw new Error(`No chapters found for ShortMax ${shortPlayCode}`);
    }

    const chapter = chapters.data[episodeIndex];
    if (!chapter) {
        throw new Error(`Episode ${episodeIndex} not found for ShortMax ${shortPlayCode}`);
    }

    // Get video URL
    const videoData = await shortmaxService.getVideoUrl(chapter.id);

    const streams = [];
    if (videoData?.videoUrl) {
        streams.push({
            url: videoData.videoUrl,
            quality: 720,
            codec: 'h264',
            isDefault: true
        });
    }

    const bestStream = selectBestStream(streams, quality);

    return {
        episode: {
            episodeId: chapter.id,
            episodeIndex: chapter.episodeNumber || episodeIndex,
            title: chapter.title || `Episode ${episodeIndex + 1}`,
            duration: chapter.duration || 0,
            cover: chapter.cover,
            streams,
            audioTracks: [],
            subtitles: [],
            selectedStream: bestStream?.url || videoData?.videoUrl,
            isVip: chapter.isVip,
            isLocked: chapter.isVip
        },
        dramaTitle: detail.title
    };
}

async function getShortmaxAllStreams(shortPlayCode, options) {
    const detail = await shortmaxService.getDetail(shortPlayCode);

    if (!detail) {
        throw new Error(`Drama not found for ShortMax ${shortPlayCode}`);
    }

    const chapters = await shortmaxService.getChapters(detail.id);

    if (!chapters?.data) {
        throw new Error(`Failed to get chapters for ShortMax ${shortPlayCode}`);
    }

    // Note: Getting video URLs for all episodes would be slow
    const episodes = chapters.data.map((ch, idx) => ({
        episodeId: ch.id,
        episodeIndex: ch.episodeNumber || idx,
        title: ch.title || `Episode ${idx + 1}`,
        duration: ch.duration || 0,
        cover: ch.cover,
        streams: [],
        selectedStream: null,
        isVip: ch.isVip,
        isLocked: ch.isVip
    }));

    return {
        dramaTitle: detail.title,
        totalEpisodes: chapters.total || episodes.length,
        episodes,
        note: 'Call /api/stream/shortmax/{code}/{episodeIndex} to get stream URL for each episode'
    };
}

export default {
    getStream,
    getAllStreams
};
