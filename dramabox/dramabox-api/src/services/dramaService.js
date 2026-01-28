/**
 * ========================================
 * Drama Service (Updated to use Direct API)
 * ========================================
 * 
 * Service layer for /api/drama/* endpoints.
 * 
 * UPDATED: Now uses Direct API with VIP bypass instead of external wrapper.
 * All episodes are returned as unlocked!
 */

import * as directService from './dramaboxDirectService.js';

// ============================================
// SERVICE FUNCTIONS - Now using Direct API
// ============================================

/**
 * Mendapatkan daftar drama trending
 */
const getTrending = async () => {
    const data = await directService.getTrending();
    return { data };
};

/**
 * Mendapatkan daftar drama terbaru
 */
const getLatest = async () => {
    const data = await directService.getLatest();
    return { data };
};

/**
 * Mendapatkan rekomendasi drama (For You)
 */
const getForYou = async () => {
    const data = await directService.getForYou();
    return { data };
};

/**
 * Mendapatkan daftar VIP drama
 */
const getVip = async () => {
    const data = await directService.getVip();
    return { data };
};

/**
 * Mencari drama berdasarkan query
 */
const search = async (query) => {
    if (!query || query.trim() === '') {
        throw new Error('Query pencarian tidak boleh kosong');
    }
    const data = await directService.search(query.trim());
    return { data };
};

/**
 * Mendapatkan pencarian populer
 */
const getPopularSearch = async () => {
    const data = await directService.getSearchIndex();
    return { data };
};

/**
 * Mendapatkan detail drama berdasarkan bookId
 * VIP BYPASS: All chapters marked as unlocked
 */
const getDetail = async (bookId) => {
    if (!bookId) {
        throw new Error('bookId diperlukan');
    }

    // Get detail from direct API
    const detail = await directService.getDetail(bookId);

    // Check if book was found
    if (!detail.book || !detail.book.bookName) {
        throw new Error(`Drama dengan bookId "${bookId}" tidak ditemukan`);
    }

    // Format response to match expected structure
    // Spread book data at root level for backward compatibility
    const formattedChapters = (detail.chapterList || []).map((ep, index) => ({
        index: index,
        chapterId: ep.chapterId,
        name: ep.chapterName,
        chapterImg: ep.chapterImg,
        // VIP BYPASS - All episodes unlocked
        unlock: true,
        isVip: ep.isVip,
        // Video URLs
        mp4: ep.videoUrl,
        m3u8Url: ep.videoUrl,
        quality: ep.quality,
        duration: ep.duration
    }));

    return {
        // Spread book data at root level
        ...detail.book,
        // Add recommends
        recommends: detail.recommends || [],
        // Add formatted chapter list
        chapterList: formattedChapters,
        // Add advertising response
        memberAdvertisingSpaceResponse: detail.memberAdvertisingSpaceResponse
    };
};

/**
 * Mendapatkan semua episode dari drama
 * VIP BYPASS: All episodes unlocked with video URLs
 */
const getAllEpisodes = async (bookId) => {
    if (!bookId) {
        throw new Error('bookId diperlukan');
    }

    const episodes = await directService.getAllEpisodesWithVideo(bookId);

    // Format to match expected structure
    const formattedEpisodes = episodes.map((ep, index) => ({
        index: index,
        chapterId: ep.chapterId,
        name: ep.chapterName,
        chapterImg: ep.chapterImg,
        // VIP BYPASS
        unlock: true,
        isVip: ep.isVip,
        mp4: ep.videoUrl,
        m3u8Url: ep.videoUrl,
        quality: ep.quality,
        allQualities: ep.allQualities,
        duration: ep.duration
    }));

    return { data: formattedEpisodes };
};

/**
 * Mendapatkan drama dub Indonesia
 */
const getDubIndo = async (classify = 'terpopuler', page = 1) => {
    const data = await directService.getDubIndo(page);
    return { data };
};

/**
 * Mendapatkan random drama video
 */
const getRandomDrama = async () => {
    const data = await directService.getRandomDrama();
    return { data };
};

// Export semua functions
export {
    getTrending,
    getLatest,
    getForYou,
    getVip,
    search,
    getPopularSearch,
    getDetail,
    getAllEpisodes,
    getDubIndo,
    getRandomDrama
};
