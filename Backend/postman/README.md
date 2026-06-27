# Postman Collections

Module-wise API collections for the Wellness backend. All collections use the shared environment.

## Import

1. Open Postman → **Import**
2. Add collections from this folder:
   - `Wellness-Admin-API.postman_collection.json`
   - `Wellness-User-API.postman_collection.json`
   - `Wellness-Coach-API.postman_collection.json`
   - `Wellness-Assistant-API.postman_collection.json`
   - `Wellness-Public-API.postman_collection.json`
   - `Wellness-Energy-Exchange-API.postman_collection.json`
3. Import environment: `Wellness-API.postman_environment.json`
4. Select **Wellness API — Local** environment

## Environment variables

| Variable | Purpose |
|----------|---------|
| `baseUrl` | Default `http://localhost:5000/api` |
| `accessToken` | User (mobile) JWT |
| `adminToken` | Admin JWT |
| `coachToken` | Wellness coach JWT |
| `assistantToken` | Assistant coach JWT |
| `transactionId` | Consultancy transaction id |

## Suggested test order

### User (mobile)
1. **Health** → Server Health
2. **Auth** → Login or Register flow
3. **Water Tracking** / **Consultancy Payment**

### Admin
1. `POST /admin/auth/login` — copy `accessToken` to `adminToken`
2. CMS or user management folders
3. **consultancy** — transactions & enrolled users

### Coach
1. `POST /coach/auth/login` — set `coachToken`
2. **heal-users** — list & reassign
3. **consultancy** — transactions & enrolled users

### Assistant
1. `POST /assistant/auth/login` — set `assistantToken`
2. **heal-users** — assigned clients only
3. **consultancy** — own transactions only

## Regenerate collections

After route changes (except User collection):

```bash
cd Backend
node scripts/buildApiCatalog.js
```

The **User** collection is hand-maintained (auth test scripts, sample bodies). Other collections are generated from route files.

## API documentation

See [`../docs/api/README.md`](../docs/api/README.md) and [`../docs/api/QUICKSTART.md`](../docs/api/QUICKSTART.md).
