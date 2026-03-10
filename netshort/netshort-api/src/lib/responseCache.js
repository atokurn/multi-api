/**
 * Response Cache
 * 
 * In-memory cache for storing decrypted API responses
 * captured from the Frida hook on the Android device.
 * 
 * URL patterns are normalized for matching.
 */

class ResponseCache {
    constructor() {
        // Map of normalized URL path -> { responseBody, timestamp, originalUrl }
        this.cache = new Map();
    }

    /**
     * Normalize a URL to a cache key
     * Strips base URL, query params, and normalizes the path
     */
    normalizeKey(url) {
        try {
            const parsed = new URL(url);
            return parsed.pathname;
        } catch {
            return url;
        }
    }

    /**
     * Store a response in cache
     */
    store(url, responseBody, timestamp = Date.now()) {
        const key = this.normalizeKey(url);

        // Parse if it's a JSON string
        let parsed = responseBody;
        if (typeof responseBody === 'string') {
            try {
                parsed = JSON.parse(responseBody);
            } catch {
                parsed = responseBody;
            }
        }

        this.cache.set(key, {
            data: parsed,
            timestamp: timestamp,
            originalUrl: url,
            storedAt: new Date().toISOString()
        });
    }

    /**
     * Get a cached response by URL
     */
    get(url) {
        const key = this.normalizeKey(url);
        return this.cache.get(key) || null;
    }

    /**
     * Get a cached response by partial path match
     */
    getByPath(pathFragment) {
        for (const [key, value] of this.cache) {
            if (key.includes(pathFragment)) {
                return value;
            }
        }
        return null;
    }

    /**
     * List all cache entries (summaries)
     */
    list() {
        return Array.from(this.cache.entries()).map(([key, value]) => ({
            path: key,
            originalUrl: value.originalUrl,
            storedAt: value.storedAt,
            dataSize: JSON.stringify(value.data).length
        }));
    }

    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }
}

export const responseCache = new ResponseCache();
