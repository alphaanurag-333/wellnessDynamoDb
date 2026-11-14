# Socket.IO on hosted environments

## Symptom

Admin shows **Offline** / no live updates; browser Network → WS fails or returns HTML.

### WebSocket handshake `Unexpected response code: 404`

Request like `wss://wellness-development…/api/socket.io/?EIO=4&transport=websocket` returns **404** and polling shows JSON:

`{"status":false,"message":"Route not found: /api/socket.io/..."}`

**Cause:** Node is still using `SOCKET_PATH=/socket.io` while traffic (and Admin) hit `/api/socket.io`. Express handles the URL → 404; Socket.IO never sees the request.

**Fix on the API server** (`wellness-development…` Backend `.env`):

```env
SOCKET_ENABLED=true
SOCKET_PATH=/api/socket.io
```

Restart Node. Confirm:

```bash
curl -s "https://wellness-development.developmentalphawizz.com/api/health"
# expect: "socket":{"enabled":true,"path":"/api/socket.io"}

curl -s "https://wellness-development.developmentalphawizz.com/api/socket.io/?EIO=4&transport=polling" | head -c 40
# expect: 0{"sid":  — NOT "Route not found"
```

## Alphawizz development layout

On `wellness-development.developmentalphawizz.com`:

- `GET /api/health` → Node API ✅
- `GET /socket.io/...` → SPA HTML ❌ (not proxied to Node)

Admin must use Engine.IO path **`/api/socket.io`** so traffic follows the same `/api/*` proxy.

### Backend `.env` (development server)

```env
SOCKET_ENABLED=true
SOCKET_PATH=/api/socket.io
# Or clear SOCKET_PATH and use:
# SOCKET_MOUNT_UNDER_API=true
SOCKET_CORS_ORIGINS=https://wellnessadmin-development.developmentalphawizz.com
```

Restart the Node process after changing env.

### Admin build

```env
VITE_API_URL=https://wellness-development.developmentalphawizz.com
VITE_SOCKET_PATH=/api/socket.io
```

Run `npm run build` and redeploy static files.

### Verify

```bash
curl -s "https://wellness-development.developmentalphawizz.com/api/socket.io/?EIO=4&transport=polling" | head -c 80
```

Expect JSON-ish body starting with `0{"sid":` — not `<!doctype html>`.

## Alternative (ops)

Keep `SOCKET_PATH=/socket.io` and add nginx/ALB WebSocket proxy for `/socket.io` to the Node upstream.
