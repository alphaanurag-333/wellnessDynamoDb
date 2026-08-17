# Postman Collections

Module-wise API collections for the Wellness backend. All collections use the shared environment.

## Import

1. Open Postman → **Import**
2. Add collections from this folder:
   - `Wellness-Seed-User-Data-for-Admin.postman_collection.json` — **start here** to create a client and feed Admin-visible data without the mobile app
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

## Seed a client for Admin (no mobile app)

Use **Wellness Dynamo — Seed User Data for Admin**. Run folders **0 → 9** in order (Collection Runner is fine).

Example client values (also in collection variables):

| Field | Example |
|-------|---------|
| Name | Madhupriya Postman |
| Email | `postman.madhupriya@example.com` |
| Phone / WhatsApp | `+91 9000010000` / `+91 9000020000` |
| DOB / gender | `1991-03-12` / female |
| Address | Flat 101, Green Meadows, Baner Road, Pune, Maharashtra 411000 |
| Diet / journey | vegetarian / self |
| Goal | Fat Loss (captured from health concerns) |
| User password | `User@12345` |
| Admin login | `admin@irwellness.local` / `Admin@12345` |

Prerequisites:

- Backend on `http://localhost:5000`
- Staff seed: `npm run seed:staff-accounts -- --confirm`
- Health concerns + supplements seeded
- `EXPOSE_OTP_IN_RESPONSE=true` so registration OTP is returned as `debugOtp`

Then open Admin at `/users/<uuid>` (not `/users/1` — that route is mock-only).

Live Admin surfaces after this collection: Users list, Personal Details, paid-onboarding grid, At a Glance. Other profile tabs still use local fixtures even if the APIs succeeded.

To rebuild the seed collection after edits:

```bash
cd Backend
node postman/buildSeedUserDataCollection.js
```

## Suggested test order

### User (mobile)
1. **Health** → Server Health
2. **Auth** → Login or Register flow
3. **Water Tracking** / **Consultancy Payment**

### Admin
1. `POST /account/auth/login` — `accessToken` is saved to `adminToken`
2. Seed collection folders 4–9, or CMS / user management folders
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
