# Share Anywhere — Production-Ready & Attractiveness Improvements

## Git push + merge task (current)
- [x] 1. Stage all changes on `main`
- [x] 2. Commit with descriptive message
- [x] 3. Push `main` to GitHub
- [x] 4. Update local `master` + merge `main` into it
- [x] 5. Push `master` to GitHub
- [x] 6. Switch back to `main`

## Root-cause analysis (cross-laptop sharing)
- "🌐 This Network" mode groups devices by their **public IP** (server-side `roomFor()`).
  - Same laptop + different browsers → same public IP → same room → devices appear. ✅
  - Different laptops on different networks → different public IPs → different rooms → no discovery. ❌
- Fix: use the **🔗 Anywhere** mode (groups by shared code) which works across any two laptops.
  - Best results via the **Upload & Share** flow (server-hosted download link) since it does NOT depend on
    WebRTC peer-to-peer NAT traversal.

## Original tasks (all done)
- [x] 1. Unique radar color + animation per character
- [x] 2. Matching peer-node CSS animations
- [x] 3. Refine Invite/Anywhere flow (file-select → upload → QR/link)
- [x] 4a. Client build passes
- [ ] 4b. Re-deploy to Render (push to repo / auto-deploy) — user's action
- [x] 5. Default every session to "Anywhere" mode with auto-generated code
- [x] 6. Fix QR code + share link generation after upload
- [x] 7. Dark Mode toggle shows target mode label
- [x] 8. Only open download modal on visitor devices

## NEW: Production-ready & attractiveness tasks
### Security (server) — ✅ implemented in `server/index.js`
- [x] 9. Add security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- [x] 10. Add rate limiting for /upload, /download, and socket connections
- [x] 11. Upload caps (max files per share, total bytes per IP session)
- [x] 12. Add /health endpoint for uptime monitoring
- [x] 13. Request logging (method, path, status, duration)

### UI/UX Attractiveness (client)
- [x] 14. Better radar empty state with clear CTA ("Invite via link")
- [x] 15. Web Share API + copy-link on invite (mobile share sheet)
- [x] 16. First-run onboarding hint (info toast) — `client/src/App.jsx` (localStorage-guarded, shown once)
- [x] 17. System `prefers-color-scheme` theme detection
- [x] 18. Celebration rings on transfer-complete modal (already present)
- [x] 19. Better meta tags + PWA `theme-color` in index.html

### Engineering (client)
- [x] 20. React ErrorBoundary to prevent white-screen crashes
- [x] 21. Toast variant support (info/success/error) — `client/src/components/Toast.jsx` + `.css`

### CI/CD
- [x] 22. GitHub Actions workflow — build client + syntax-check server on push/PR (`.github/workflows/ci.yml`)

