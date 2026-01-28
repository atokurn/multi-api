# DramaWave API Documentation

## Base URL
```
https://dramabox-api-test.vercel.app/api/dramawave
```

## Authentication
DramaWave uses OAuth signature authentication with device-based credentials. All endpoints are authenticated automatically.

---

## Endpoints

### 1. For You Feed
Get personalized drama recommendations.

```http
GET /foryou?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "provider": "dramawave",
  "data": [
    {
      "id": "kVpS4E1Ms6",
      "key": "kVpS4E1Ms6",
      "title": "Drama Title",
      "cover": "https://static-v1.mydramawave.com/...",
      "description": "Description...",
      "episodeCount": 60,
      "viewCount": 0,
      "followCount": 4185,
      "free": false,
      "tags": ["Romance", "Drama"],
      "currentEpisode": {
        "id": "6VoLnNjFbT",
        "name": "Episode 1",
        "cover": "https://...",
        "videoUrl": "https://video-v6.mydramawave.com/...m3u8",
        "duration": 161,
        "index": 1
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "next": "offset=10"
  }
}
```

### 2. Home Feed
Get homepage content with sections.

```http
GET /home?page=1&limit=20
```

### 3. Trending
Get trending/hot dramas.

```http
GET /trending?page=1&limit=20
```

### 4. Ranking
Get ranking list by category.

```http
GET /ranking?page=1&limit=20
```

### 5. Search
Search dramas by keyword.

```http
GET /search?q=keyword&page=1&limit=20
```

### 6. Drama Detail
Get drama details by ID.

```http
GET /detail/:id
```

**Example:** `GET /detail/kVpS4E1Ms6`

### 7. Episode List
Get episode list for a drama.

```http
GET /episodes/:id?page=1&limit=100
```

**Note:** Currently returns first episode info. Full episode list requires further API investigation.

### 8. Video Stream
Get video stream URL for an episode.

```http
GET /stream/:episodeId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoUrl": "https://video-v6.mydramawave.com/...m3u8",
    "duration": 161
  }
}
```

---

## Video Stream Details

- **Format:** HLS (m3u8) adaptive streaming
- **Resolutions Available:**
  - 1080x1920 (Full HD)
  - 720x1280 (HD)
  - 540x960
  - 480x854
  - 360x640
- **Audio:** zh-CN (Mandarin dubbing available)

---

## Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Invalid parameters |
| 401  | Authentication failed |
| 404  | Not found |
| 500  | Server error |

---

## Working Status

| Endpoint | Status |
|----------|--------|
| `/foryou` | ✅ Working |
| `/home` | ✅ Working |
| `/trending` | ✅ Working |
| `/ranking` | ✅ Working |
| `/search` | ✅ Working |
| `/detail/:id` | ⚠️ Partial |
| `/episodes/:id` | ⚠️ Partial |
| `/stream/:episodeId` | ✅ Working |

---

## Video Playback Verification

All video URLs from `/foryou` endpoint tested and confirmed working:

| Drama | HTTP Status |
|-------|-------------|
| Satu Insiden, Semua Pria Menginginkanku | ✅ 200 |
| Ayahku Ternyata Bos Besar | ✅ 200 |
| Mata Ilahi, Penguasa Kota | ✅ 200 |
| Menceraikan Suami Miliarderku | ✅ 200 |
| Pemerintahan Kaisar Pendendam | ✅ 200 |

