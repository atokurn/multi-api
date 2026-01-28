/**
 * ========================================
 * Type Definitions
 * ========================================
 * 
 * JSDoc type definitions for unified API responses.
 * Used across all providers (DramaBox, FlickReels, Melolo).
 */

/**
 * Supported languages
 * @typedef {'id' | 'en' | 'zh' | 'ko'} Language
 */

/**
 * Supported video qualities
 * @typedef {1080 | 720 | 540 | 360 | 'auto'} Quality
 */

/**
 * Supported stream formats
 * @typedef {'hls' | 'mp4' | 'dash'} StreamFormat
 */

/**
 * Supported providers
 * @typedef {'dramabox' | 'flickreels' | 'melolo' | 'shortmax'} Provider
 */

/**
 * Video stream information
 * @typedef {Object} VideoStream
 * @property {string} url - Stream URL (HLS/MP4)
 * @property {number} quality - Video quality (1080, 720, 540, 360)
 * @property {string} [codec] - Video codec (h264, hevc)
 * @property {number} [bitrate] - Bitrate in kbps
 * @property {boolean} [isDefault] - Whether this is the default stream
 */

/**
 * Audio track information
 * @typedef {Object} AudioTrack
 * @property {string} language - ISO 639-1 code (id, en, zh, ko)
 * @property {string} label - Display label ("Indonesian", "English")
 * @property {string} [url] - Audio stream URL (if separate from video)
 * @property {boolean} isDubbing - True if dubbed audio
 * @property {boolean} [isDefault] - Whether this is the default track
 */

/**
 * Subtitle information
 * @typedef {Object} Subtitle
 * @property {string} language - ISO 639-1 code
 * @property {string} label - Display label
 * @property {string} url - Subtitle file URL (VTT/SRT)
 * @property {boolean} [isDefault] - Whether this is the default subtitle
 */

/**
 * Episode stream response
 * @typedef {Object} EpisodeStream
 * @property {string} episodeId - Episode unique identifier
 * @property {number} episodeIndex - Episode index (0-based)
 * @property {string} title - Episode title
 * @property {number} duration - Duration in seconds
 * @property {string} [cover] - Episode cover image URL
 * @property {VideoStream[]} streams - Multiple quality options
 * @property {AudioTrack[]} audioTracks - Dubbing/audio options
 * @property {Subtitle[]} subtitles - Subtitle options
 * @property {string} selectedStream - Selected stream URL based on quality preference
 * @property {boolean} isVip - Whether this is VIP content
 * @property {boolean} isLocked - Whether this episode is locked
 */

/**
 * Stream request options
 * @typedef {Object} StreamOptions
 * @property {Language} [lang='id'] - Content language
 * @property {Quality} [quality='auto'] - Preferred video quality
 * @property {string} [dubbing='original'] - Dubbing language preference
 * @property {StreamFormat} [format='hls'] - Output stream format
 */

/**
 * Provider stream response
 * @typedef {Object} ProviderStreamResponse
 * @property {boolean} success - Whether the request was successful
 * @property {Provider} provider - Provider name
 * @property {string} dramaId - Drama/Book/Playlet ID
 * @property {string} [dramaTitle] - Drama title
 * @property {EpisodeStream} episode - Episode stream data
 * @property {string} [source] - Data source (cache/live)
 * @property {number} [ttl] - Cache TTL remaining
 */

/**
 * Language labels mapping
 */
export const LANGUAGE_LABELS = {
    id: 'Indonesia',
    en: 'English',
    zh: '中文',
    ko: '한국어'
};

/**
 * Quality labels mapping
 */
export const QUALITY_LABELS = {
    1080: '1080p HD',
    720: '720p HD',
    540: '540p',
    360: '360p'
};

/**
 * Default stream options
 */
export const DEFAULT_STREAM_OPTIONS = {
    lang: 'id',
    quality: 'auto',
    dubbing: 'original',
    format: 'hls'
};

/**
 * Select best stream based on quality preference
 * @param {VideoStream[]} streams - Available streams
 * @param {Quality} preferredQuality - Preferred quality
 * @returns {VideoStream|null} - Best matching stream
 */
export function selectBestStream(streams, preferredQuality = 'auto') {
    if (!streams || streams.length === 0) return null;

    // Sort streams by quality (highest first)
    const sorted = [...streams].sort((a, b) => b.quality - a.quality);

    if (preferredQuality === 'auto') {
        // Return highest quality available
        return sorted[0];
    }

    // Try to find exact match
    const exact = sorted.find(s => s.quality === preferredQuality);
    if (exact) return exact;

    // Find closest quality (prefer higher if exact not available)
    const higher = sorted.find(s => s.quality >= preferredQuality);
    if (higher) return higher;

    // Fallback to highest available
    return sorted[0];
}

/**
 * Create empty episode stream structure
 * @returns {EpisodeStream}
 */
export function createEmptyEpisodeStream() {
    return {
        episodeId: '',
        episodeIndex: 0,
        title: '',
        duration: 0,
        cover: null,
        streams: [],
        audioTracks: [],
        subtitles: [],
        selectedStream: null,
        isVip: false,
        isLocked: false
    };
}

/**
 * Validate provider name
 * @param {string} provider - Provider name to validate
 * @returns {boolean} - True if valid provider
 */
export function isValidProvider(provider) {
    return ['dramabox', 'flickreels', 'melolo', 'shortmax'].includes(provider);
}

/**
 * Validate language code
 * @param {string} lang - Language code to validate
 * @returns {boolean} - True if valid language
 */
export function isValidLanguage(lang) {
    return ['id', 'en', 'zh', 'ko'].includes(lang);
}

/**
 * Validate quality value
 * @param {string|number} quality - Quality to validate
 * @returns {boolean} - True if valid quality
 */
export function isValidQuality(quality) {
    if (quality === 'auto') return true;
    const num = parseInt(quality);
    return [1080, 720, 540, 360].includes(num);
}
