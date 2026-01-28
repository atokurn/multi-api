/**
 * Sapimu.au API Client
 * Proxies requests through sapimu.au which has working ShortMax/DramaBox implementation
 */

import axios from 'axios';

const SAPIMU_BASE_URL = 'https://sapimu.au';

// Token from user - can be overridden via env var
let SAPIMU_TOKEN = process.env.SAPIMU_TOKEN || '9d9129bb21c8bda90f4da0305ff37040cd073ed2ffd050c5d8f24f1a1699d3db';

const client = axios.create({
    baseURL: SAPIMU_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Add auth header to all requests
client.interceptors.request.use(config => {
    config.headers.Authorization = `Bearer ${SAPIMU_TOKEN}`;
    return config;
});

export function setToken(token) {
    SAPIMU_TOKEN = token;
}

/**
 * DramaBox API via Sapimu.au
 */
export const dramabox = {
    async getForYou(page = 1, lang = 'in') {
        const resp = await client.get(`/dramabox/api/foryou/${page}`, { params: { lang } });
        return resp.data;
    },

    async getNew(page = 1, pageSize = 20, lang = 'in') {
        const resp = await client.get(`/dramabox/api/new/${page}`, { params: { lang, pageSize } });
        return resp.data;
    },

    async getRanking(page = 1, lang = 'in') {
        const resp = await client.get(`/dramabox/api/rank/${page}`, { params: { lang } });
        return resp.data;
    },

    async search(keyword, page = 1, lang = 'in') {
        const resp = await client.get(`/dramabox/api/search/${encodeURIComponent(keyword)}/${page}`, { params: { lang } });
        return resp.data;
    },

    async getChapters(bookId, lang = 'in') {
        const resp = await client.get(`/dramabox/api/chapters/${bookId}`, { params: { lang } });
        return resp.data;
    },

    async getChaptersDetail(bookId, lang = 'in') {
        const resp = await client.get(`/dramabox/api/chapters/detail/${bookId}`, { params: { lang } });
        return resp.data;
    },

    async getWatch(bookId, chapterIndex = 0, lang = 'in', source = 'foryou') {
        const resp = await client.get(`/dramabox/api/watch/${bookId}/${chapterIndex}`, { params: { lang, source } });
        return resp.data;
    },

    async postWatch(bookId, chapterIndex, lang = 'in') {
        const resp = await client.post(`/dramabox/api/watch/player`, {
            bookId,
            chapterIndex,
            lang
        }, { params: { lang } });
        return resp.data;
    },

    async classify(genre, sort = 1, page = 1, lang = 'in') {
        const resp = await client.get('/dramabox/api/classify', {
            params: { lang, pageNo: page, genre, sort }
        });
        return resp.data;
    },

    async suggest(keyword, lang = 'in') {
        const resp = await client.get(`/dramabox/api/suggest/${encodeURIComponent(keyword)}`, { params: { lang } });
        return resp.data;
    }
};

/**
 * ShortMax API via Sapimu.au (if available)
 */
export const shortmax = {
    async getForYou(page = 1, lang = 'in') {
        try {
            const resp = await client.get(`/shortmax/api/foryou/${page}`, { params: { lang } });
            return resp.data;
        } catch (e) {
            console.error('ShortMax ForYou error:', e.message);
            return null;
        }
    },

    async getWatch(dramaId, chapterIndex = 0, lang = 'in') {
        try {
            const resp = await client.get(`/shortmax/api/watch/${dramaId}/${chapterIndex}`, { params: { lang } });
            return resp.data;
        } catch (e) {
            console.error('ShortMax Watch error:', e.message);
            return null;
        }
    },

    async search(keyword, page = 1, lang = 'in') {
        try {
            const resp = await client.get(`/shortmax/api/search/${encodeURIComponent(keyword)}/${page}`, { params: { lang } });
            return resp.data;
        } catch (e) {
            console.error('ShortMax Search error:', e.message);
            return null;
        }
    }
};

export default {
    setToken,
    dramabox,
    shortmax,
    SAPIMU_BASE_URL
};
