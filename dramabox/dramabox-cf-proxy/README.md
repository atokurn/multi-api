# Cloudflare Worker Proxy untuk DramaBox

Proxy ini menggunakan IP Cloudflare untuk bypass blocking dari DramaBox API.

## Cara Deploy

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login ke Cloudflare
```bash
wrangler login
```
Browser akan terbuka untuk autentikasi.

### 3. Deploy Worker
```bash
cd cloudflare-proxy
wrangler deploy
```

### 4. Catat URL Worker
Setelah deploy, akan muncul URL seperti:
```
https://dramabox-proxy.YOUR_SUBDOMAIN.workers.dev
```

### 5. Set Environment Variable di Vercel
Di Vercel dashboard, tambahkan:
```
DRAMABOX_PROXY_URL=https://dramabox-proxy.YOUR_SUBDOMAIN.workers.dev
```

## Testing

Test langsung dengan curl:
```bash
curl -X POST https://dramabox-proxy.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/drama-box/he001/recommendBook",
    "method": "POST",
    "body": {"isNeedRank": 1, "specialColumnId": 0, "pageNo": 1},
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent": "okhttp/4.10.0"
    }
  }'
```

## Gratis Tier Cloudflare Workers
- 100,000 requests/hari (gratis)
- Lebih dari cukup untuk production
