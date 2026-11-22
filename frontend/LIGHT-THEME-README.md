# AgentShield — Poppins Light Theme

A visual refresh of the existing AgentShield UI 2.0 frontend.

## Design

- Modern light enterprise dashboard (white surfaces, soft gray workspace).
- Google Fonts **Poppins** (400, 500, 600, 700), with system font fallback when offline.
- Restrained slate/navy and blue controls; muted green/red for outcomes.
- Removed ornamental shield-orbit hero art, neon glow, dark gradients, and sci-fi styling.
- More compact page headings, professional card and table hierarchy, and responsive layout.

## Included files

This is a minimal **UI-only patch** intended for the v2 frontend you already installed:

- `index.html` — page title and Poppins font loading.
- `src/index.css` — global typography and light scheme.
- `src/App.css` — complete application light theme.
- `src/trace-enhancements.css` — light trace/evidence styles.
- `src/App.jsx` — cosmetic wording and removal of decorative hero graphics.

The API contract, React behavior, demos, state, test files, dependencies, and backend are not changed.

## Installation (PowerShell)

Run from your AgentShield repository root. Be on your `feature/ui-enhancement` branch.

```powershell
Expand-Archive -Path "$env:USERPROFILE\Downloads\AgentShield-Poppins-Light-Theme.zip" -DestinationPath ".\frontend" -Force
cd frontend
npm test
npm run build
npm run dev
```

If Vite is already running, a browser hard refresh (`Ctrl+Shift+R`) should load the new styles. If you do not have an active backend, the evaluation endpoint will show a fetch error; this is unrelated to the theme. Run the FastAPI server in its own terminal with `AGENTSHIELD_LIVE_LLM=false` for a deterministic demo.

## Verification

- JSX parsed and transpiled successfully with TypeScript.
- CSS files parsed successfully using PostCSS.
- The original Vitest suite and Vite build were **not** executable in the packaging environment because npm dependencies were unavailable offline. Run them on your local machine before committing.

Do not mistake the "Preview Demo Data" output for a real backend evaluation. Session-only history remains unchanged.
