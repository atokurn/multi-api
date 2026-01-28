# ShortMax API

Standalone ShortMax API service.

## Configuration

This service relies on a Sapimu Proxy to access ShortMax content.
You must configure the `SAPIMU_TOKEN` in `src/services/shortmaxService.js` or via Environment Variables.

### Environment Variables
Create a `.env` file in the root:

```env
SAPIMU_TOKEN=your_sapimu_token_here
PORT=3000
```

## Deployment

### Vercel
The project includes `vercel.json` for easy deployment.

```bash
vercel deploy
```

### Local Development

```bash
npm install
npm run dev
```

## Endpoints

- `GET /api/search?q=keyword`
- `GET /api/ranking`
- `GET /api/detail/:code`
- `GET /api/chapters/:code`
- `GET /api/play/:code/:index`
