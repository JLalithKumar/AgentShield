# AgentShield UI 2.0 — Frontend Enhancement

This is a **frontend-only** visual redesign of the uploaded AgentShield React/Vite project. No backend or Release Gate source files are included or modified.

## What's new

- Distinctive AgentShield command-center styling with teal-on-navy identity and shield branding.
- Refined sidebar with workspace context and responsive mobile navigation.
- Richer Evaluation Console: configuration cards, 3-step evaluation flow, KPI panels, pass-rate bar, and clear BLOCKED/ALLOWED states.
- Better Evidence Trace contrast between banking API status and agent claims, including explicit mismatch emphasis.
- Scenario Library filters and specification panels styled consistently.
- Evaluation History overview showing session runs and decision counts.
- Accessible focus outlines, reduced-motion support, and no added JavaScript dependencies.

## Behavioral guarantees

The existing `POST /api/evaluations` request, `VITE_API_BASE_URL` configuration, candidate versions, scenario library data, demo-vs-API labeling, evaluation-history storage rules, evidence trace details, and release-decision calculations have been left unchanged.

**Important:** Demo previews are synthetic fixtures, not live AI evaluations. Evaluation History remains in React memory and resets on page refresh. Live Qwen3 behavior is configured by the backend separately; this redesign does not add a UI switch for it.

## Install on Windows PowerShell

1. Keep your working Git branch `feature/ui-enhancement` selected.
2. Copy this ZIP to your PC (for example, your Downloads directory).
3. From your project root, unzip it **into the existing `frontend` directory**:

```powershell
Expand-Archive -Path "$env:USERPROFILE\Downloads\AgentShield-Frontend-UI-v2.zip" `
  -DestinationPath "E:\Visionet\AgentShield-Techthon-2026\frontend" -Force
```

4. Run frontend checks:

```powershell
cd E:\Visionet\AgentShield-Techthon-2026\frontend
npm test
npm run build
npm run dev
```

5. Check the existing FastAPI integration with your normal backend process. The frontend still defaults to `http://localhost:8000` unless `VITE_API_BASE_URL` is set.

### Validation performed in the creation environment

- App.jsx parsed and transpiled successfully with TypeScript's JSX compiler.
- App.css, index.css, and trace-enhancements.css parsed successfully with PostCSS.
- The source retains the original API calls, navigation, fixtures, and test files.

**The original 28 Vitest cases and Vite production build were not executable in this creation environment**, because npm registry DNS requests failed during dependency installation. Run `npm test` and `npm run build` on your Windows machine before creating or merging a pull request.

## Files updated

- `src/App.jsx`
- `src/App.css`
- `src/index.css`
- `src/trace-enhancements.css`

All other uploaded source, test, asset, and metadata files are preserved.
