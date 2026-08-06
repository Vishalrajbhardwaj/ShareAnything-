# TODO — Avatar Image Feature

## Steps
- [x] 1. Create `client/public/avatars/characters/` directory and copy/rename matched images from `server/lib/Imges/`
- [x] 2. Update `client/src/lib/avatars.js` — add `AVATAR_SETS` (name → array of paths) + `randomAvatar(name)` helper
- [x] 3. Update `server/lib/avatars.js` — same structure
- [x] 4. Update `server/lib/names.js` — use `randomAvatar(name)` so each connection gets a random variant
- [x] 5. Update `ProfileModal.jsx` avatar picker to show all variants per character
- [x] 6. Update `SettingsPanel.jsx` avatar picker to show all variants per character
- [x] 7. Delete `_image_gallery.html` helper
- [x] 8. Test the app
