# FlickReels Unlock Node

Deployable ke multiple Vercel accounts untuk bypass IP-based rate limits.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Shared Upstash Redis URL |
| `FLICKREELS_TOKEN` | FlickReels auth token |
| `NODE_ID` | Unique ID for this node (1, 2, 3, etc) |
| `DEVICE_ID` | Device ID for this node |
| `DEVICE_SIGN` | Device signature |

## Deploy ke Multiple Accounts

### Node 1 (Akun Utama)
```bash
cd flickreels-unlock-node
npx vercel --prod -e NODE_ID="1" -e REDIS_URL="xxx" -e FLICKREELS_TOKEN="xxx"
```

### Node 2 (Akun Kedua)
```bash
# Login ke akun lain dulu
npx vercel logout
npx vercel login

# Deploy
npx vercel --prod -e NODE_ID="2" -e REDIS_URL="xxx" -e FLICKREELS_TOKEN="xxx"
```

### Node 3 (Akun Ketiga)
```bash
npx vercel logout
npx vercel login
npx vercel --prod -e NODE_ID="3" -e REDIS_URL="xxx" -e FLICKREELS_TOKEN="xxx"
```

## API Endpoint

### POST /api/unlock

Request:
```json
{
  "playletId": "1445",
  "chapterId": "105121"
}
```

Response (cache hit):
```json
{
  "success": true,
  "source": "cache",
  "videoUrl": "https://..."
}
```

Response (live unlock):
```json
{
  "success": true,
  "source": "live",
  "nodeId": "1",
  "videoUrl": "https://..."
}
```

## Features

- ✅ Cache-first (cek Redis sebelum unlock)
- ✅ Atomic locking (prevent race conditions)
- ✅ Shared cache antar semua nodes
- ✅ Per-node rate limit tracking
