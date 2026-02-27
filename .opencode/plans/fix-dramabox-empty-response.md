# Plan: Fix DramaBox API Empty Response / Missing Video Links

## Problem
DramaBox API sering mengembalikan response data kosong. Saat buka drama, link video sering tidak muncul, kadang hanya sebagian episode yang mendapat link.

## Root Cause Analysis

7 penyebab ditemukan setelah analisis menyeluruh pada codebase:

---

## Fix 1: Bug `refreshCredentials()` - Credential Tidak Disimpan ke Pool (CRITICAL)

**File:** `dramabox/dramabox-api/src/lib/credentialsManager.js` (line 138-142)

**Problem:** `refreshCredentials()` set credential pool ke `null`, fetch token baru, tapi TIDAK menyimpan hasilnya kembali ke pool. Token baru hilang begitu saja.

**Before:**
```js
export const refreshCredentials = async () => {
    console.log(`[CredentialsManager] Force refreshing credentials for Pool ${currentPoolIndex}...`);
    credentialPool[currentPoolIndex] = null;
    return await fetchFreshToken();
};
```

**After:**
```js
export const refreshCredentials = async () => {
    console.log(`[CredentialsManager] Force refreshing credentials for Pool ${currentPoolIndex}...`);
    credentialPool[currentPoolIndex] = null;
    const newCred = await fetchFreshToken();
    credentialPool[currentPoolIndex] = newCred; // Save back to pool!
    return newCred;
};
```

---

## Fix 2: Tingkatkan Retry Logic untuk Empty `videoPathList` (HIGH)

**File:** `dramabox/dramabox-api/src/services/dramaboxDirectService.js` (line 662-690)

**Problem:** Hanya 1x retry per episode tanpa backoff. Episode yang gagal masuk array dengan `videoUrl: undefined`.

**Changes:**
Replace the retry block (line 666-690) with:

```js
// RETRY LOGIC FOR EMPTY VIDEO URL - Enhanced with multiple retries
const MAX_VIDEO_RETRIES = 3;
if (videoPathList.length === 0) {
    console.log(`[getAllEpisodesWithVideo] Empty video list for episode ${chapter.chapterId}. Retrying...`);
    
    for (let retryAttempt = 1; retryAttempt <= MAX_VIDEO_RETRIES; retryAttempt++) {
        try {
            await delay(500 * retryAttempt); // Exponential backoff: 500ms, 1000ms, 1500ms
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
                    console.log(`[getAllEpisodesWithVideo] Retry ${retryAttempt} succeeded for episode ${chapter.chapterId}`);
                    break;
                }
            }
        } catch (e) {
            console.error(`[getAllEpisodesWithVideo] Retry ${retryAttempt} error for episode ${chapter.chapterId}:`, e.message);
        }
    }
    
    if (videoPathList.length === 0) {
        console.warn(`[getAllEpisodesWithVideo] All retries failed for episode ${chapter.chapterId}`);
    }
}
```

Also add `hasVideo` field to the processed chapter object:

```js
processedChapters.push({
    chapterId: chapter.chapterId,
    chapterName: chapter.chapterName,
    chapterIndex: chapter.chapterIndex,
    chapterImg: chapter.chapterImg,
    isVip: false,
    isLocked: false,
    quality: video?.quality,
    videoUrl: video?.videoPath,
    hasVideo: !!video?.videoPath,  // NEW: flag for consumers
    allQualities: availableQualities,
    duration: chapter.duration,
    _originalIsVip: chapter.isVip
});
```

---

## Fix 3: Validasi Cache - Jangan Cache Data Kosong/Parsial (HIGH)

**File:** `dramabox/dramabox-api/src/services/dramaboxDirectService.js` (line 734-739)

**Problem:** Data kosong/parsial di-cache 15 menit, request berikutnya mendapat data kosong dari cache.

**Before:**
```js
if (allEpisodes.length > 0) {
    // Update Cache
    episodeCache.set(bookId, {
        timestamp: Date.now(),
        data: allEpisodes
    });
    break;
}
```

**After:**
```js
if (allEpisodes.length > 0) {
    // Validate: count episodes with actual video URLs
    const episodesWithVideo = allEpisodes.filter(ep => ep.videoUrl);
    const videoRate = episodesWithVideo.length / allEpisodes.length;
    
    if (videoRate >= 0.5) {
        // Cache with full TTL if at least 50% episodes have video URLs
        episodeCache.set(bookId, {
            timestamp: Date.now(),
            data: allEpisodes
        });
    } else if (videoRate > 0) {
        // Cache with shorter TTL (2 minutes) for partial data
        console.warn(`[getAllEpisodesWithVideo] Only ${Math.round(videoRate * 100)}% episodes have video URLs. Using short cache TTL.`);
        episodeCache.set(bookId, {
            timestamp: Date.now() - (CACHE_TTL - 2 * 60 * 1000), // Effectively 2min TTL
            data: allEpisodes
        });
    } else {
        // Don't cache if no episodes have video URLs
        console.warn(`[getAllEpisodesWithVideo] No episodes have video URLs. Skipping cache.`);
    }
    break;
}
```

---

## Fix 4: Set Emulator/Root/VPN Flags ke '0' (MEDIUM)

**File:** `dramabox/dramabox-api/src/lib/dramaboxClient.js` (line 139-142)

**Problem:** `is_emulator: '1'`, `is_root: '1'`, `is_vpn: '1'` bisa trigger server-side restrictions.

**Before:**
```js
// Emulator/Root detection (set to match our emulator)
'is_emulator': '1',
'is_root': '1',
'is_vpn': '1',
```

**After:**
```js
// Emulator/Root detection - set to '0' to avoid server-side restrictions
'is_emulator': '0',
'is_root': '0',
'is_vpn': '0',
```

---

## Fix 5: Tambah Fallback Direct Request jika CF Proxy Gagal (MEDIUM)

**File:** `dramabox/dramabox-api/src/lib/dramaboxClient.js` (line 218-244)

**Problem:** Jika CF proxy gagal, tidak ada fallback. Request langsung error.

**Before:**
```js
if (CF_PROXY_URL) {
    const proxyResponse = await fetch(CF_PROXY_URL, { ... });
    const proxyResult = await proxyResponse.json();
    if (!proxyResult.success) {
        throw new Error(proxyResult.error || 'Cloudflare proxy request failed');
    }
    return proxyResult.data;
}
```

**After:**
```js
if (CF_PROXY_URL) {
    try {
        const proxyResponse = await fetch(CF_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint,
                method,
                body: payload,
                headers,
                timestamp
            })
        });
        const proxyResult = await proxyResponse.json();
        if (proxyResult.success) {
            return proxyResult.data;
        }
        console.warn(`[DramaBoxClient] CF Proxy returned error: ${proxyResult.error}. Falling back to direct request...`);
    } catch (proxyError) {
        console.warn(`[DramaBoxClient] CF Proxy failed: ${proxyError.message}. Falling back to direct request...`);
    }
    // Fall through to direct request below
}
```

Note: Remove the early `return` so the code falls through to the direct request path below.

---

## Fix 6: Perbaiki Rate Limiting - Adaptive Delay & Exponential Backoff (MEDIUM)

**File:** `dramabox/dramabox-api/src/services/dramaboxDirectService.js` (line 584-585, 729)

**Problem:** `baseDelay` 500ms terlalu cepat, menyebabkan rate limiting lebih sering.

**Changes:**

1. Increase base delay:
```js
// Before:
let baseDelay = 500;

// After:
let baseDelay = 1000; // Increased to reduce rate limiting risk
```

2. Add jitter and exponential backoff after rotation (line 729):
```js
// Before:
const currentDelay = credentialRotationCount > 0 ? baseDelay + 500 : baseDelay;
await delay(currentDelay);

// After:
const jitter = Math.floor(Math.random() * 300); // Random 0-300ms jitter
const currentDelay = credentialRotationCount > 0 
    ? baseDelay * Math.pow(1.5, credentialRotationCount) + jitter 
    : baseDelay + jitter;
await delay(currentDelay);
```

3. Increase wait after rotation (line 647):
```js
// Before:
await delay(1000);

// After:
await delay(2000 * credentialRotationCount); // Exponential wait: 2s, 4s, 6s
```

---

## Fix 7: Pool Pre-warming di `initializePool()` (LOW)

**File:** `dramabox/dramabox-api/src/lib/credentialsManager.js` (line 147-152)

**Problem:** Hanya slot 0 yang di-prefill. Rotasi ke slot lain butuh cold fetch.

**Before:**
```js
export const initializePool = async () => {
    console.log('[CredentialsManager] Initializing credential pool...');
    await getCredentials(0);
};
```

**After:**
```js
export const initializePool = async () => {
    console.log('[CredentialsManager] Initializing credential pool...');
    // Pre-fill first 3 slots with staggered fetches
    await getCredentials(0);
    // Fetch additional slots in background (don't block startup)
    setTimeout(async () => {
        try { await getCredentials(1); } catch (e) { 
            console.warn('[CredentialsManager] Pre-warm slot 1 failed:', e.message); 
        }
    }, 2000);
    setTimeout(async () => {
        try { await getCredentials(2); } catch (e) { 
            console.warn('[CredentialsManager] Pre-warm slot 2 failed:', e.message); 
        }
    }, 4000);
};
```

---

## Implementation Order

1. Fix 1 (credential bug) - Highest impact, smallest change
2. Fix 4 (emulator flags) - Quick win, single line change
3. Fix 6 (rate limiting delays) - Reduces root cause of rate limiting
4. Fix 2 (retry logic) - Handles remaining empty episodes
5. Fix 3 (cache validation) - Prevents serving stale empty data
6. Fix 5 (CF proxy fallback) - Adds resilience
7. Fix 7 (pool pre-warming) - Optimization

## Files Modified

1. `dramabox/dramabox-api/src/lib/credentialsManager.js` (Fix 1, Fix 7)
2. `dramabox/dramabox-api/src/lib/dramaboxClient.js` (Fix 4, Fix 5)
3. `dramabox/dramabox-api/src/services/dramaboxDirectService.js` (Fix 2, Fix 3, Fix 6)

## Verification

After implementation, test with:
1. `node test-dramabox-video-url.js` - Verify video URLs are present
2. `node test-rate-limit-fix.js` - Verify credential rotation works
3. Manual test: Request episodes for a known drama and verify all episodes have video URLs
