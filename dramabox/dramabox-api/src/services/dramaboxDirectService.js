/**
 * ========================================
 * DramaBox Direct Service
 * ========================================
 * 
 * Service layer untuk mengakses DramaBox API secara langsung.
 * Menggunakan official endpoints dari sapi.dramaboxdb.com.
 * 
 * All functions support optional `lang` parameter for multi-language:
 * - 'id' (Indonesian) - default
 * - 'en' (English)
 * - 'zh' (Chinese)
 * - 'ko' (Korean)
 */

import { post } from '../lib/dramaboxClient.js';

// Default language
const DEFAULT_LANG = 'id';

// ============================================
// HOME & BROWSE
// ============================================

/**
 * Get theater/home page data
 * @param {number} pageNo - Page number (default: 1)
 * @param {string} lang - Language code (default: 'id')
 * @returns {Object} Theater data with drama list
 */
export const getTheater = async (pageNo = 1, lang = DEFAULT_LANG) => {
    const data = await post('/drama-box/he001/theater', {
        newChannelStyle: 1,
        isNeedRank: 1,
        pageNo,
        index: 1,
        channelId: 43
    }, lang);

    return data?.data || data;
};

/**
 * Get recommended books
 * @param {number} pageNo - Page number
 * @param {string} lang - Language code (default: 'id')
 * @returns {Array} List of recommended dramas
 */
export const getRecommended = async (pageNo = 1, lang = DEFAULT_LANG) => {
    const data = await post('/drama-box/he001/recommendBook', {
        isNeedRank: 1,
        specialColumnId: 0,
        pageNo
    }, lang);

    // Flatten nested structure if present
    const rawList = data?.data?.recommendList?.records || [];

    return rawList.flatMap(item => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
            return item.tagCardVo.tagBooks;
        }
        return [item];
    });
};

/**
 * Get new theater list (latest dramas)
 * @param {number} pageNo - Page number
 * @param {string} lang - Language code (default: 'id')
 * @returns {Array} List of latest dramas
 */
export const getLatest = async (pageNo = 1, lang = DEFAULT_LANG) => {
    const data = await post('/drama-box/he001/theater', {
        newChannelStyle: 1,
        isNeedRank: 1,
        pageNo,
        index: 0,
        type: 0,
        channelId: 175
    }, lang);

    // Try newTheaterList.records first
    const theaterRecords = data?.data?.newTheaterList?.records || [];
    if (theaterRecords.length > 0) {
        return theaterRecords;
    }

    // Fallback: Extract from columnVoList (contains categorized book lists)
    const columnVoList = data?.data?.columnVoList || [];
    const allBooks = columnVoList.flatMap(col => col.bookList || []);
    if (allBooks.length > 0) {
        return allBooks;
    }

    // Fallback: Extract from recommendList.records
    const recommendRecords = data?.data?.recommendList?.records || [];
    return recommendRecords.flatMap(item => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
            return item.tagCardVo.tagBooks;
        }
        return [item];
    });
};

// ============================================
// SEARCH
// ============================================

/**
 * Search dramas by keyword
 * @param {string} keyword - Search query
 * @param {string} lang - Language code (default: 'id')
 * @returns {Array} Search results
 */
export const search = async (keyword, lang = DEFAULT_LANG) => {
    const data = await post('/drama-box/search/suggest', { keyword }, lang);
    return data?.data?.suggestList || [];
};

/**
 * Get search index (hot/trending searches)
 * @returns {Object} Search index data
 */
export const getSearchIndex = async () => {
    const data = await post('/drama-box/search/index', {});
    return {
        hotVideos: data?.data?.hotVideoList || [],
        hotKeywords: data?.data?.hotKeywordList || []
    };
};

/**
 * Get "For You" recommendations (personalized)
 * Uses recommendBook endpoint as forYou endpoint returns 404
 * @param {number} pageNo - Page number
 * @returns {Array} For You drama list
 */
export const getForYou = async (pageNo = 1) => {
    // Note: /drama-box/he001/forYou returns 404, use recommendBook instead
    const data = await post('/drama-box/he001/recommendBook', {
        isNeedRank: 1,
        specialColumnId: 0,
        pageNo
    });

    // Extract from recommendList.records with proper flattening
    const rawList = data?.data?.recommendList?.records || [];
    return rawList.flatMap(item => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
            return item.tagCardVo.tagBooks;
        }
        // Filter out items without bookId (non-book cards)
        if (item.bookId) {
            return [item];
        }
        return [];
    });
};

/**
 * Get dubbed Indonesian content
 * @param {number} pageNo - Page number
 * @returns {Array} Dubbed drama list
 */
export const getDubIndo = async (pageNo = 1) => {
    // Use theater endpoint with Indonesian dub channel
    const data = await post('/drama-box/he001/theater', {
        newChannelStyle: 1,
        isNeedRank: 1,
        pageNo,
        index: 1,
        channelId: 176  // Dub Indo channel
    });
    return data?.data?.channelList || data?.data?.newTheaterList?.records || [];
};

/**
 * Get random drama video
 * @returns {Object} Random drama data
 */
export const getRandomDrama = async () => {
    // Get recommendations and pick a random one
    const data = await post('/drama-box/he001/recommendBook', {
        isNeedRank: 1,
        specialColumnId: 0,
        pageNo: Math.floor(Math.random() * 5) + 1  // Random page 1-5
    });

    const rawList = data?.data?.recommendList?.records || [];
    const dramas = rawList.flatMap(item => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
            return item.tagCardVo.tagBooks;
        }
        return [item];
    });

    // Return random item
    if (dramas.length > 0) {
        return dramas[Math.floor(Math.random() * dramas.length)];
    }
    return null;
};

/**
 * Get trending/popular dramas (alias for ranking)
 * @returns {Array} Trending dramas
 */
export const getTrending = async () => {
    return getRanking(1);  // Ranking type 1 = trending/hot
};

/**
 * Get VIP content page
 * @param {number} pageNo - Page number
 * @returns {Object} VIP content data
 */
export const getVip = async (pageNo = 1) => {
    const data = await post('/drama-box/he001/theater', {
        newChannelStyle: 1,
        isNeedRank: 1,
        pageNo,
        index: 1,
        channelId: 44  // VIP channel
    });
    return data?.data || [];
};

// ============================================
// DETAIL & EPISODES
// ============================================

/**
 * Get drama detail by bookId
 * Returns complete data including book, recommends, and chapterList
 * 
 * Strategy:
 * 1. Try ap001/infoLoad first (official endpoint)
 * 2. If no book data, use chapterv2/batch/load (returns book info + chapters)
 * 3. Get recommendations from recommendBook
 * 
 * @param {string} bookId - Drama ID
 * @returns {Object} Drama detail (book, recommends, chapterList)
 */
export const getDetail = async (bookId) => {
    let bookData = null;
    let recommendsData = [];
    let chapterListData = [];
    let memberAdvertisingResponse = { showSpace: 0 };

    // Validate bookId
    if (!bookId) {
        throw new Error('bookId is required');
    }

    // Strategy 1: Try chapterv2/batch/load FIRST (most reliable, returns book + chapters)
    // The infoLoad endpoint seems to always return empty book data
    console.log('[getDetail] Trying batch/load for bookId:', bookId);

    try {
        const batchData = await post('/drama-box/chapterv2/batch/load', {
            boundaryIndex: 0,
            comingPlaySectionId: -1,
            index: 1,
            currencyPlaySource: 'discover_new_rec_new',
            needEndRecommend: 0,
            currencyPlaySourceName: '',
            preLoad: false,
            rid: '',
            pullCid: '',
            loadDirection: 0,
            startUpKey: '',
            bookId
        });

        if (batchData?.data?.bookName) {
            // Extract book info from batch/load response
            bookData = {
                bookId: batchData.data.bookId || bookId,
                bookName: batchData.data.bookName,
                cover: batchData.data.bookCover,
                coverWap: batchData.data.bookCover,
                introduction: batchData.data.introduction || '',
                chapterCount: batchData.data.chapterCount,
                viewCount: batchData.data.playCount,
                playCount: batchData.data.playCount,
                inLibraryCount: batchData.data.inLibraryCount || 0,
                tags: batchData.data.tags || [],
                labels: batchData.data.tags || [],
                tagNames: batchData.data.tags || [],
                tagV3s: batchData.data.tagV3s || [],
                corner: batchData.data.corner,
                bookStatus: batchData.data.bookStatus,
                bookCategory: batchData.data.bookCategory,
                performers: batchData.data.performers,
                vip: batchData.data.vip,
                inLibrary: batchData.data.inLibrary,
                lastChapterUtime: batchData.data.lastChapterUtime
            };
            console.log('[getDetail] Found book from batch/load:', bookData.bookName);

            // Use chapter list from batch/load directly
            const rawChapters = batchData.data.chapterList || [];
            chapterListData = rawChapters.map(chapter => {
                const cdn = chapter.cdnList?.find(c => c.isDefault === 1) || chapter.cdnList?.[0];
                const videoPathList = cdn?.videoPathList || [];
                const video = videoPathList.find(v => v.quality === 720)
                    || videoPathList.find(v => v.quality === 540)
                    || videoPathList.find(v => v.quality === 480)
                    || videoPathList[0];

                return {
                    chapterId: chapter.chapterId,
                    chapterName: chapter.chapterName,
                    chapterIndex: chapter.chapterIndex,
                    chapterImg: chapter.chapterImg,
                    isVip: false,
                    isLocked: false,
                    quality: video?.quality,
                    videoUrl: video?.videoPath,
                    duration: chapter.duration
                };
            });
        }
    } catch (e) {
        console.log('[getDetail] Batch/load failed:', e.message);
    }

    // Strategy 2: If batch/load failed, try infoLoad as backup
    if (!bookData) {
        console.log('[getDetail] Trying infoLoad for bookId:', bookId);
        try {
            const primaryData = await post('/drama-box/ap001/infoLoad', {
                scene: 2,
                bookId
            });

            if (primaryData?.data?.book && primaryData.data.book.bookName) {
                bookData = primaryData.data.book;
                recommendsData = primaryData.data.recommends || [];
                chapterListData = primaryData.data.chapterList || [];
                memberAdvertisingResponse = primaryData.data.memberAdvertisingSpaceResponse || memberAdvertisingResponse;

                return {
                    book: bookData,
                    recommends: recommendsData,
                    chapterList: chapterListData,
                    memberAdvertisingSpaceResponse: memberAdvertisingResponse
                };
            }
        } catch (e) {
            console.log('[getDetail] infoLoad failed:', e.message);
        }
    }

    // Strategy 3: If still no data, try to find in recommendation list
    if (!bookData) {
        console.log('[getDetail] Trying to find in recommend list for bookId:', bookId);
        try {
            const recData = await post('/drama-box/he001/recommendBook', {
                isNeedRank: 1,
                specialColumnId: 0,
                pageNo: 1
            });

            const rawList = recData?.data?.recommendList?.records || [];
            const allDramas = rawList.flatMap(item => {
                if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
                    return item.tagCardVo.tagBooks;
                }
                if (item.bookId) return [item];
                return [];
            });

            const found = allDramas.find(d => String(d.bookId) === String(bookId));
            if (found) {
                bookData = {
                    bookId: found.bookId,
                    bookName: found.bookName || found.name,
                    cover: found.cover || found.coverWap,
                    coverWap: found.coverWap || found.cover,
                    introduction: found.introduction || found.desc || '',
                    author: found.author || '',
                    protagonist: found.protagonist || '',
                    tagNames: found.tagNames || [],
                    tags: found.tags || found.tagNames || [],
                    labels: found.tagNames || [],
                    tagV3s: found.tagV3s || [],
                    chapterCount: found.chapterCount,
                    viewCount: found.viewCount,
                    playCount: found.playCount || found.viewCount,
                    inLibraryCount: found.inLibraryCount || 0,
                    corner: found.corner
                };
                console.log('[getDetail] Found book from recommend list:', bookData.bookName);

                // Now get chapters via batch/load since we have a valid bookId
                try {
                    const batchData = await post('/drama-box/chapterv2/batch/load', {
                        boundaryIndex: 0,
                        comingPlaySectionId: -1,
                        index: 1,
                        currencyPlaySource: 'discover_new_rec_new',
                        needEndRecommend: 0,
                        currencyPlaySourceName: '',
                        preLoad: false,
                        rid: '',
                        pullCid: '',
                        loadDirection: 0,
                        startUpKey: '',
                        bookId: found.bookId
                    });

                    const rawChapters = batchData?.data?.chapterList || [];
                    chapterListData = rawChapters.map(chapter => {
                        const cdn = chapter.cdnList?.find(c => c.isDefault === 1) || chapter.cdnList?.[0];
                        const videoPathList = cdn?.videoPathList || [];
                        const video = videoPathList.find(v => v.quality === 720)
                            || videoPathList.find(v => v.quality === 540)
                            || videoPathList.find(v => v.quality === 480)
                            || videoPathList[0];

                        return {
                            chapterId: chapter.chapterId,
                            chapterName: chapter.chapterName,
                            chapterIndex: chapter.chapterIndex,
                            chapterImg: chapter.chapterImg,
                            isVip: false,
                            isLocked: false,
                            quality: video?.quality,
                            videoUrl: video?.videoPath,
                            duration: chapter.duration
                        };
                    });
                } catch (e) {
                    console.log('[getDetail] Chapter fetch for found book failed:', e.message);
                }
            }
        } catch (e) {
            console.log('[getDetail] Recommend list search failed:', e.message);
        }
    }

    // Strategy 4: Get recommendations (always try to get these)
    if (recommendsData.length === 0) {
        try {
            console.log('[getDetail] Fetching recommendations');
            const recData = await post('/drama-box/he001/recommendBook', {
                isNeedRank: 1,
                specialColumnId: 0,
                pageNo: 1
            });

            const rawList = recData?.data?.recommendList?.records || [];
            recommendsData = rawList.flatMap(item => {
                if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
                    return item.tagCardVo.tagBooks.slice(0, 6);
                }
                if (item.bookId && String(item.bookId) !== String(bookId)) {
                    return [item];
                }
                return [];
            }).slice(0, 10);
        } catch (e) {
            console.log('[getDetail] Recommendation fetch failed:', e.message);
        }
    }

    // If book was found, return success response
    if (bookData && bookData.bookName) {
        return {
            book: bookData,
            recommends: recommendsData,
            chapterList: chapterListData,
            memberAdvertisingSpaceResponse: memberAdvertisingResponse
        };
    }

    // Book not found - return null to indicate 404
    console.log('[getDetail] Book not found for bookId:', bookId);
    return {
        book: null,
        recommends: recommendsData,
        chapterList: [],
        memberAdvertisingSpaceResponse: memberAdvertisingResponse,
        error: 'Drama tidak ditemukan'
    };
};

/**
 * Get all chapters/episodes with streaming links
 * VIP BYPASS ENABLED - All episodes returned as unlocked
 * 
 * @param {string} bookId - Drama ID
 * @param {number} episodeIndex - Starting episode index (default: 1)
 * @returns {Object} Episode data with streaming URLs (all unlocked)
 */
export const getEpisodes = async (bookId, episodeIndex = 1) => {
    const data = await post('/drama-box/chapterv2/batch/load', {
        boundaryIndex: 0,
        comingPlaySectionId: -1,
        index: episodeIndex,
        currencyPlaySource: 'discover_new_rec_new',
        needEndRecommend: 0,
        currencyPlaySourceName: '',
        preLoad: false,
        rid: '',
        pullCid: '',
        loadDirection: 0,
        startUpKey: '',
        bookId
    });

    const chapterList = data?.data?.chapterList || [];

    // Format episodes with video URLs - VIP BYPASS
    return chapterList.map(chapter => {
        const cdn = chapter.cdnList?.find(c => c.isDefault === 1) || chapter.cdnList?.[0];
        const videoPathList = cdn?.videoPathList || [];

        // VIP BYPASS: Get best quality video REGARDLESS of isVipEquity
        // Priority: 720p > 540p > 480p > any
        const video = videoPathList.find(v => v.quality === 720)
            || videoPathList.find(v => v.quality === 540)
            || videoPathList.find(v => v.quality === 480)
            || videoPathList[0];

        // Get ALL available qualities for flexibility
        const availableQualities = videoPathList.map(v => ({
            quality: v.quality,
            url: v.videoPath,
            isVipEquity: v.isVipEquity
        }));

        return {
            chapterId: chapter.chapterId,
            chapterName: chapter.chapterName,
            chapterIndex: chapter.chapterIndex,
            chapterImg: chapter.chapterImg,
            // VIP BYPASS: Always set to false (unlocked)
            isVip: false,
            isLocked: false,
            // Best quality video
            quality: video?.quality,
            videoUrl: video?.videoPath,
            // All available qualities
            allQualities: availableQualities,
            duration: chapter.duration,
            // Original VIP status (for reference)
            _originalIsVip: chapter.isVip
        };
    });
};

/**
 * Get ALL episodes with video URLs using pagination
 * VIP BYPASS ENABLED - All episodes returned as unlocked
 * 
 * @param {string} bookId - Drama ID
 * @returns {Array} All episodes with streaming URLs
 */
export const getAllEpisodesWithVideo = async (bookId) => {
    let allEpisodes = [];
    let currentIndex = 1;
    const BATCH_SIZE = 6;
    let maxIterations = 30; // Safety limit for ~180 episodes max
    let consecutiveEmpty = 0;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Helper function for delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (maxIterations > 0) {
        let data;

        try {
            data = await post('/drama-box/chapterv2/batch/load', {
                boundaryIndex: 0,
                comingPlaySectionId: -1,
                index: currentIndex,
                currencyPlaySource: 'discover_new_rec_new',
                needEndRecommend: 0,
                currencyPlaySourceName: '',
                preLoad: false,
                rid: '',
                pullCid: '',
                loadDirection: 1, // Forward direction
                startUpKey: '',
                bookId
            });
        } catch (error) {
            console.error(`[getAllEpisodesWithVideo] Error at index ${currentIndex}:`, error.message);

            // If it's an HTML error page (rate limiting), retry with exponential backoff
            if (error.message.includes('HTML error page') && retryCount < MAX_RETRIES) {
                retryCount++;
                const backoffDelay = 1000 * retryCount; // 1s, 2s, 3s
                console.log(`[getAllEpisodesWithVideo] Retrying in ${backoffDelay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
                await delay(backoffDelay);
                continue;
            }

            // If we have some episodes already, return what we got
            if (allEpisodes.length > 0) {
                console.log(`[getAllEpisodesWithVideo] Returning ${allEpisodes.length} episodes collected before error`);
                break;
            }

            throw error;
        }

        // Reset retry count on success
        retryCount = 0;

        const chapterList = data?.data?.chapterList || [];

        if (chapterList.length === 0) {
            consecutiveEmpty++;
            // Stop after 2 consecutive empty results
            if (consecutiveEmpty >= 2) break;
            currentIndex += BATCH_SIZE;
            maxIterations--;
            continue;
        }

        consecutiveEmpty = 0;

        // Process each chapter with VIP bypass
        // Process each chapter with VIP bypass
        const processedChapters = [];
        for (const chapter of chapterList) {
            let cdn = chapter.cdnList?.find(c => c.isDefault === 1) || chapter.cdnList?.[0];
            let videoPathList = cdn?.videoPathList || [];

            // RETRY LOGIC FOR EMPTY VIDEO URL
            if (videoPathList.length === 0) {
                console.log(`[getAllEpisodesWithVideo] Empty video list for episode ${chapter.chapterId}. Retrying single fetch...`);
                try {
                    // Slight delay before retry
                    await delay(500);
                    const singleChapterData = await post('/drama-box/chapterv2/batch/load', {
                        boundaryIndex: 0,
                        comingPlaySectionId: -1,
                        index: chapter.chapterIndex,
                        currencyPlaySource: 'discover_new_rec_new',
                        preLoad: false,
                        loadDirection: 0,
                        bookId
                    });

                    const singleChapter = singleChapterData?.data?.chapterList?.[0];
                    if (singleChapter) {
                        cdn = singleChapter.cdnList?.find(c => c.isDefault === 1) || singleChapter.cdnList?.[0];
                        videoPathList = cdn?.videoPathList || [];
                        if (videoPathList.length > 0) {
                            console.log(`[getAllEpisodesWithVideo] Retry success for episode ${chapter.chapterId}`);
                        } else {
                            console.warn(`[getAllEpisodesWithVideo] Retry failed for episode ${chapter.chapterId}: Still no video path`);
                        }
                    }
                } catch (e) {
                    console.error(`[getAllEpisodesWithVideo] Retry error for episode ${chapter.chapterId}:`, e.message);
                }
            }

            const video = videoPathList.find(v => v.quality === 720)
                || videoPathList.find(v => v.quality === 540)
                || videoPathList.find(v => v.quality === 480)
                || videoPathList[0];

            const availableQualities = videoPathList.map(v => ({
                quality: v.quality,
                url: v.videoPath,
                isVipEquity: v.isVipEquity
            }));

            processedChapters.push({
                chapterId: chapter.chapterId,
                chapterName: chapter.chapterName,
                chapterIndex: chapter.chapterIndex,
                chapterImg: chapter.chapterImg,
                isVip: false,
                isLocked: false,
                quality: video?.quality,
                videoUrl: video?.videoPath,
                allQualities: availableQualities,
                duration: chapter.duration,
                _originalIsVip: chapter.isVip
            });
        }

        allEpisodes = allEpisodes.concat(processedChapters);

        // Check if we got less than batch size - likely last batch
        if (chapterList.length < BATCH_SIZE) {
            break;
        }

        // Increment index by batch size
        currentIndex += BATCH_SIZE;
        maxIterations--;

        // Add small delay between requests to prevent rate limiting
        await delay(150);
    }

    // Remove duplicates by chapterId and sort by chapterIndex
    const uniqueEpisodes = [...new Map(allEpisodes.map(ep => [ep.chapterId, ep])).values()];
    uniqueEpisodes.sort((a, b) => (a.chapterIndex || 0) - (b.chapterIndex || 0));

    return uniqueEpisodes;
};

/**
 * Get chapter list (alias for getAllEpisodesWithVideo)
 * @param {string} bookId - Drama ID
 * @returns {Array} Chapter list
 */
export const getChapterList = async (bookId) => {
    return getAllEpisodesWithVideo(bookId);
};

// ============================================
// RANKING & CATEGORIES
// ============================================

/**
 * Get ranking list
 * @param {number} rankType - Rank type (1=hot, 2=new, etc)
 * @returns {Array} Ranked dramas
 */
export const getRanking = async (rankType = 1) => {
    // Correct endpoint: he001/rank (verified)
    const data = await post('/drama-box/he001/rank', {
        rankVersion: 2,
        rankTypeList: [rankType]
    });

    // API returns rankList directly as array of books (not nested bookList)
    // Each item in rankList IS a book with bookId, bookName, coverWap, etc.
    const rankList = data?.data?.rankList || [];

    // Check if rankList contains books directly (new API format)
    if (rankList.length > 0 && rankList[0]?.bookId) {
        return rankList;
    }

    // Fallback: Old format with nested bookList
    const nestedBooks = rankList?.[0]?.bookList || [];
    if (nestedBooks.length > 0) {
        return nestedBooks;
    }

    // Final fallback: try records field
    return data?.data?.records || [];
};

// ============================================
// NEW ENDPOINTS (Based on DramaHub API)
// ============================================

/**
 * Get dramas filtered by genre/category
 * Similar to DramaHub /classify endpoint
 * 
 * @param {Object} options - Filter options
 * @param {number} options.genre - Genre ID (e.g., 1357 for Romance)
 * @param {number} options.sort - Sort type (1=popular, 2=latest, etc)
 * @param {number} options.pageNo - Page number
 * @param {string} options.lang - Language code
 * @returns {Array} Filtered drama list
 */
export const getClassify = async ({ genre = 0, sort = 1, pageNo = 1, lang = DEFAULT_LANG } = {}) => {
    // Use theater endpoint with category parameters
    const data = await post('/drama-box/he001/theater', {
        newChannelStyle: 1,
        isNeedRank: 0,
        pageNo,
        index: 0,
        type: sort,
        channelId: genre || 43, // Default channel if no genre specified
        tagId: genre
    }, lang);

    // Try to extract book list from various possible locations
    const theaterRecords = data?.data?.newTheaterList?.records || [];
    if (theaterRecords.length > 0) {
        return {
            list: theaterRecords,
            hasMore: data?.data?.newTheaterList?.hasMore || false,
            pageNo: pageNo
        };
    }

    // Fallback: Try columnVoList
    const columnVoList = data?.data?.columnVoList || [];
    const allBooks = columnVoList.flatMap(col => col.bookList || []);
    if (allBooks.length > 0) {
        return {
            list: allBooks,
            hasMore: false,
            pageNo: pageNo
        };
    }

    // Fallback: Try recommendList
    const recommendRecords = data?.data?.recommendList?.records || [];
    const dramas = recommendRecords.flatMap(item => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
            return item.tagCardVo.tagBooks;
        }
        if (item.bookId) return [item];
        return [];
    });

    return {
        list: dramas,
        hasMore: false,
        pageNo: pageNo
    };
};

/**
 * Get video URL for a specific episode
 * Similar to DramaHub /watch/:bookId/:episodeIndex endpoint
 * VIP BYPASS ENABLED - Returns unlocked video URLs
 * 
 * @param {string} bookId - Drama ID
 * @param {number} episodeIndex - Episode index (0-based)
 * @returns {Object} Video data with streaming URL
 */
export const getWatchVideo = async (bookId, episodeIndex = 0) => {
    const data = await post('/drama-box/chapterv2/batch/load', {
        boundaryIndex: 0,
        comingPlaySectionId: -1,
        index: episodeIndex + 1,  // API uses 1-based index
        currencyPlaySource: 'discover_new_rec_new',
        needEndRecommend: 0,
        currencyPlaySourceName: '',
        preLoad: false,
        rid: '',
        pullCid: '',
        loadDirection: 0,
        startUpKey: '',
        bookId
    });

    const chapterList = data?.data?.chapterList || [];

    // Find the requested episode
    const chapter = chapterList.find(ch => ch.chapterIndex === episodeIndex)
        || chapterList[0];

    if (!chapter) {
        throw new Error(`Episode ${episodeIndex} not found for bookId ${bookId}`);
    }

    // Extract video URLs
    const cdn = chapter.cdnList?.find(c => c.isDefault === 1) || chapter.cdnList?.[0];
    const videoPathList = cdn?.videoPathList || [];

    // Get best quality video (VIP BYPASS)
    const bestVideo = videoPathList.find(v => v.quality === 1080)
        || videoPathList.find(v => v.quality === 720)
        || videoPathList.find(v => v.quality === 540)
        || videoPathList[0];

    // Get all available qualities
    const qualities = videoPathList.map(v => ({
        quality: v.quality,
        videoPath: v.videoPath,
        isVipEquity: v.isVipEquity,
        isDefault: v.isDefault || 0
    }));

    return {
        bookId: data?.data?.bookId || bookId,
        bookName: data?.data?.bookName,
        bookCover: data?.data?.bookCover,
        chapterId: chapter.chapterId,
        chapterName: chapter.chapterName,
        chapterIndex: chapter.chapterIndex,
        chapterImg: chapter.chapterImg,
        duration: chapter.duration,
        // Primary video URL (best quality, VIP bypassed)
        videoUrl: bestVideo?.videoPath,
        quality: bestVideo?.quality,
        // All available qualities
        qualities: qualities,
        // VIP status (always unlocked in our implementation)
        isVip: false,
        isLocked: false,
        _originalIsVip: chapter.isVip
    };
};

/**
 * Get search suggestions
 * Similar to DramaHub /suggest endpoint
 * 
 * @param {string} keyword - Search query
 * @param {string} lang - Language code
 * @returns {Array} Suggested search terms and dramas
 */
export const getSuggest = async (keyword, lang = DEFAULT_LANG) => {
    const data = await post('/drama-box/search/suggest', { keyword }, lang);

    const suggestList = data?.data?.suggestList || [];

    // Format the suggestions
    return suggestList.map(item => ({
        bookId: item.bookId,
        bookName: item.bookName,
        cover: item.coverWap || item.cover,
        chapterCount: item.chapterCount,
        introduction: item.introduction,
        tags: item.tagNames || item.tags || [],
        playCount: item.playCount
    }));
};

/**
 * Get available genres/categories
 * @returns {Array} List of available genres
 */
export const getGenres = async () => {
    // Common genre IDs from DramaBox
    // These are based on observed tagIds from the API
    return [
        { id: 1357, name: 'Romance', nameEn: 'Romance' },
        { id: 1352, name: 'Modern', nameEn: 'Modern' },
        { id: 1337, name: 'Balas Dendam', nameEn: 'Revenge' },
        { id: 1338, name: 'Pembalikan Identitas', nameEn: 'Hidden Identity' },
        { id: 1340, name: 'Serangan Balik', nameEn: 'Counterattack' },
        { id: 1339, name: 'Bangkitnya Orang Biasa', nameEn: 'Underdog Story' },
        { id: 1341, name: 'Perselingkuhan', nameEn: 'Betrayal' },
        { id: 1400, name: 'Perselingkuhan', nameEn: 'Betrayal' },
        { id: 1401, name: 'Mengejar Istri', nameEn: 'Winning Her Back' },
        { id: 1374, name: 'Gadis Naif', nameEn: 'Innocent Damsel' },
        { id: 1654, name: 'Penyesalan', nameEn: 'All-Too-Late' },
        { id: 1319, name: 'Sejarah', nameEn: 'Historical' },
        { id: 1344, name: 'Perjalanan Waktu', nameEn: 'Time Travel' },
        { id: 1334, name: 'Kekuatan Khusus', nameEn: 'The Chosen One' },
        { id: 1327, name: 'Bangsawan', nameEn: 'Royalty' },
        { id: 1380, name: 'Cinta Segitiga', nameEn: 'Love Triangle' },
        { id: 1422, name: 'Kesempatan Kedua', nameEn: 'Second Chance' }
    ];
};

export default {
    getTheater,
    getRecommended,
    getLatest,
    search,
    getSearchIndex,
    getForYou,
    getDubIndo,
    getRandomDrama,
    getTrending,
    getVip,
    getDetail,
    getEpisodes,
    getAllEpisodesWithVideo,
    getChapterList,
    getRanking,
    // New endpoints
    getClassify,
    getWatchVideo,
    getSuggest,
    getGenres
};
