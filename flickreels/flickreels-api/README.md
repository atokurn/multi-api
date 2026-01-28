# FlickReels API

Standalone FlickReels API service.

## Configuration

This service communicates with the FlickReels backend via `flickreelsClient.js`.

### Environment Variables
Create a `.env` file in the root:

```env
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

- `GET /api/flickreels/home?lang=id`
- `GET /api/flickreels/navigation`
- `GET /api/flickreels/foryou?page=1&lang=id`
- `GET /api/flickreels/detail/:playletId`
- `GET /api/flickreels/episodes/:playletId`
