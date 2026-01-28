# DramaBox API v2.0

REST API untuk mengakses DramaBox dengan signature authentication yang sudah terverifikasi.

## 🚀 Quick Deploy ke Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/dramabox-api)

```bash
npm install -g vercel
vercel
```

## 📡 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/token` | Get credentials (token, deviceid, androidid) |
| GET | `/api/dramabox/recommend` | Recommended dramas |
| GET | `/api/dramabox/search?q=...` | Search dramas |
| GET | `/api/dramabox/detail/:bookId` | Drama detail |
| GET | `/api/dramabox/episodes/:bookId` | Episodes with stream URLs |
| GET | `/api/dramabox/ranking` | Ranking list |
| GET | `/api/dramabox/latest` | Latest dramas |
| GET | `/health` | Health check |

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs at http://localhost:5000
```

## 📖 Usage Examples

### Get Token
```bash
curl https://your-api.vercel.app/token
```

Response:
```json
{
  "token": "ZXlKMGVYQWlPaUpL...",
  "deviceid": "4071e87a-08cc-4ee3-9922-0577f83c73b2",
  "androidid": "000000002894f5d02894f5d000000000"
}
```

### Search Dramas
```bash
curl "https://your-api.vercel.app/api/dramabox/search?q=love"
```

### Get Episodes
```bash
curl "https://your-api.vercel.app/api/dramabox/episodes/41000118861"
```

## 🔧 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Signature**: SHA256WithRSA (verified from DramaBox v5.1.1)
- **Platform**: Vercel Serverless

## 📝 License

MIT
