# Client profile realtime — QA matrix

## Staging setup

- `SOCKET_ENABLED=true` on Backend
- Admin `VITE_SOCKET_ENABLED=true` (optional; defaults on when API connects)
- Open client profile for a live UUID user (not numeric mock id)

## Per-domain checks

| Domain | Client → Admin | Staff panel → Admin (2 tabs) | Coach editing (no overwrite) |
|--------|----------------|------------------------------|------------------------------|
| food | Log meal in app; Food tab updates &lt;1s | Save meal on tab A; tab B refreshes | Edit meal macro; ignore event while busy |
| body | Upload progress photo | Review photo on another tab | Toggle settings while photo upload |
| medical | Submit medical onboarding | Approve on panel | — |
| healthProgress | Log weight in app | Review photo on panel | — |
| glance | — | Post coach message; insight updates | Draft coach message not overwritten |
| bms | Log steps | Assign library item | Toggle in-app while polling off |
| personal | — | Edit phone on panel | Form focus not overwritten |

## Connection

- [ ] Disconnect network → reconnect → one full manual/poll sync on visible tab
- [ ] Invalid token → socket rejected; fallback poll still works if enabled
- [ ] Subscribe without access → error ack; no room join
- [ ] Archived mock user → no socket subscribe on Admin

## Production cutover

- [ ] ALB/proxy allows WebSocket upgrade on API port
- [ ] `SOCKET_CORS_ORIGINS` includes production Admin origin
- [ ] Interval polling disabled on Admin client profile (socket + focus resync only)
