# Send/Invite Redesign + Theme Fix — Task Steps

## Completed
- [x] Analyzed codebase (App.jsx, InviteView, TransferList, usePeerConnections, fileTransfer, CSS files)
- [x] Confirmed plan with user
- [x] Create SendView.jsx (File/Folder/Text/Paste actions, queued file rows, single device selection, Send Now, per-file progress bars with %, speed, ETA, completion summary with elapsed time)
- [x] Create SendView.css (themed with CSS variables for dark/light)
- [x] Simplify InviteView.jsx (focused on QR/code/link sharing + file selection that publishes to server so visitors see download modal)
- [x] Update InviteView.css (themed file selection UI, QR card, buttons, modal)
- [x] Update App.jsx (send view now uses SendView)
- [x] Fix theming for App.css (.page-card uses CSS variables)
- [x] Fix theming for AppNav.css (sidebar, bottom bar, text, activity — light overrides)
- [x] Fix theming for RadarView.css (radar, status panel, labels — light overrides)
- [x] Fix theming for TransferList.css (transfer cards use CSS variables)
- [x] Build client successfully (vite build passed)
- [x] InviteView: Copy Link shows "✓ Link Copied!" confirmation (green) for 2s
- [x] InviteView: "Upload & Share" button after file selection (publishes files + creates link/QR)
- [x] Fix blank screen on opening share link (?net=CODE):
  - Auto-open Invite view when a net code is present in URL
  - Auto-request share files on connect so the download modal opens reliably
- [x] Build client successfully after fixes (vite build passed)
- [x] Fix InviteView flow: "Upload & Share" button now always appears after file selection (uses `shared` state so QR/link step only shows when explicitly uploaded, even with a netCode already in URL)
