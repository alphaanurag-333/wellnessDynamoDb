# Wellness Backend

Node.js / Express API for the Wellness platform. Data store: AWS DynamoDB.

## Quick links

- **[API documentation](./docs/README.md)** — route reference, Postman, quick start
- **[Postman collections](./postman/README.md)** — Admin, User, Coach, Assistant, Public
- **[Database docs](../docs/database/README.md)** — schema, indexes, relationships

## Run locally

```bash
cd Backend
npm install
cp .env.example .env   # configure AWS, JWT, etc.
npm start              # production
npm run dev            # or: npx nodemon server.js (auto-reload)
```

Health check: `GET http://localhost:5000/api/health`

## Regenerate API catalog

```bash
node scripts/buildApiCatalog.js
```

## API modules

| Prefix | Audience |
|--------|----------|
| `/api/admin/*` | Admin panel |
| `/api/user/*` | Mobile app users |
| `/api/coach/*` | Wellness coach portal |
| `/api/assistant/*` | Assistant coach portal |
| `/api/public/*` | Unauthenticated app content |
