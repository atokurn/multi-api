# DramaNova Unofficial API Proxy

This is an unofficial Node.js/Express proxy for the DramaNova API. It acts as a bridge between your client applications and the upstream DramaNova servers, handling encryption/decryption, payload formatting, and providing custom, optimized endpoints.

## Features

- **Automatic Encryption/Decryption**: Transparently handles the AES+RSA encryption required by the upstream server.
- **Payload Formatting**: Ensures requests are correctly formatted for the upstream server.
- **Custom Optimized Endpoints**: Provides lightweight, chunked data delivery to save bandwidth and prevent spam detection.
- **In-Memory Caching**: Caches heavy requests (like full playlet details) to reduce load on the upstream server and speed up response times for subsequent episode requests.
- **Endpoint Protection**: Blocks known broken upstream endpoints to prevent cascading errors and wasted resources.

## Setup & Running

```bash
cd dramanova-api
npm install
node index.js
```

The server will start on `http://localhost:3000` with the base prefix `/api/`.

---

## 🚀 Custom Endpoints (Recommended)

To avoid triggering spam/scraping detection on the upstream server and to save bandwidth, we have implemented custom endpoints. 

When you request a playlet detail from the original API, it returns the entire metadata + all episodes (often 60-100 episodes) with their video URLs in one massive payload. Our custom endpoints split this up using a smart caching mechanism.

### 1. Get Playlet Info (Lightweight)
Use this for the drama detail/info page before the user clicks "Play".

- **Endpoint:** `GET /api/custom/playlet/:dramaId/info`
- **Description:** Returns the full drama metadata (title, synopsis, poster, monetization rules) but **removes the heavy `episodes` and `videos` arrays**.
- **Caching:** Triggers a fetch from upstream and caches the full result for 10 minutes.

### 2. Get Single Episode Data
Use this when the user is watching a specific episode.

- **Endpoint:** `GET /api/custom/playlet/:dramaId/episode/:episodeIndex`
- **Params:** `episodeIndex` is 1-based (e.g., `1` for the first episode).
- **Description:** Returns only the data and streaming URLs for the requested episode.
- **Caching:** Retrieves the data instantly from the local proxy cache. If the cache is empty, it fetches from upstream once and caches it. This means requesting Episode 1, then Episode 2, then Episode 3 only results in **1 request** to the upstream server.

---

## 🟢 Standard Endpoints (Pass-through)

These endpoints pass through directly to the upstream server and work perfectly.

### Authentication
- **Register Guest:** `POST /api/auth/register`
- **Login:** `POST /api/auth/login` (Returns the `access_token` needed for other endpoints)

### Drama & Playlet Lists
- **Standard Drama List:** `GET /api/drama/list`
- **Playlet Drama List:** `GET /api/playlet/drama/query`

### Playlet Detail (Raw)
- **Full Detail:** `GET /api/playlet/drama/:dramaId` (Returns the massive payload. *Use the Custom Endpoints instead if possible.*)

---

## 🔴 Blocked / Broken Upstream Endpoints

The proxy actively blocks requests to the following endpoints because they are currently broken or missing on the upstream DramaNova servers. The proxy will return a `403 Forbidden` immediately to save resources.

1. **`GET /api/drama/:dramaId`** 
   - **Reason:** Broken on the upstream server. Returns a `500 Internal Server Error` due to a backend SQL syntax error (`java.sql.SQLSyntaxErrorException`) involving the `short_drama_config_monetization` table.
2. **`GET /api/drama/new/list`**
   - **Reason:** Endpoint does not exist upstream (`404 Not Found`).
3. **`GET /api/drama/recommend/list`**
   - **Reason:** Endpoint does not exist upstream (`404 Not Found`).
