# Work Permit — UI Mock Sandbox

This is a **UI-only** sandbox version of the Work Permit app. It's a standalone
Vite project — it doesn't share `node_modules` with the real repo, doesn't need
a backend, and doesn't need a login.

## Run it

```bash
npm install --legacy-peer-deps
npm run dev
```

(`--legacy-peer-deps` is needed because `react-dropdown-tree-select` hasn't
declared React 19 as a supported peer yet — same as the real repo.)

That's it. The app opens straight into a populated Work Permit detail page —
no login screen, no blank states, no setup required.

## What you're working on

Edit anything under:

- `src/pages/` — full pages (`WorkPermitDetail.jsx` is the main one)
- `src/components/` — shared UI components (`common/`, `dashboard/`, `layout/`)
- `src/utils/` — formatting/display helpers
- `src/scss/` — styles
- `src/fixtures/index.js` — the sample data driving everything. Change the
  work permit's `status`, `approval_levels`, `dynamic_fields`, etc. here to see
  how the UI reacts to different states (e.g. set `status: 'ACTIVE'` to see the
  "Mark as Completed" / "Suspend" buttons instead of the approval flow).
- `src/dashboard-widgets/*.html` — the 5 Dashboard widgets (`wp-status-summary`,
  `wp-by-type`, `wp-by-priority`, `wp-trend`, `wp-upcoming`). In the real system
  these live in a database and are edited through the admin panel; here they're
  plain files so you don't need DB/admin access. Each file is a raw
  `function App({ fetchData, isEdit }) { ... return React.createElement(...) }`
  body — no JSX, no imports, just `React.createElement` calls (that's the format
  the admin panel stores/evals, so keep writing them the same way). Go to the
  **Dashboard** page in the app to see all 5 render in the real grid layout;
  edit a file and refresh the browser to see the change (no HMR for these,
  they're evaluated once on mount).

## What NOT to touch / send back

`src/context/AppContext.jsx` and everything in `src/services/` are **fake
scaffolding for this sandbox only** — they return canned fixture data instead
of calling a real API. The real repo has real versions of these files that
talk to actual backends. **Don't send these back** — only send back files
under `src/pages/`, `src/components/`, `src/utils/`, or `src/scss/`.

Every page/component calls these fake services exactly the same way the real
ones are called (same function names, same `res.data.data` / `res.data.status`
shapes), so anything you build here works unmodified once dropped into the
real repo.

## Handing work back

When a component is ready, send back just that file, keeping its path (e.g.
`src/pages/WorkPermitDetail.jsx`, `src/components/common/ConfirmDialog.jsx`).
It drops into the real repo at the identical path with no changes needed.

Dashboard widgets (`src/dashboard-widgets/wp-*.html`) go back the same way —
they're byte-for-byte the same content the admin panel needs; whoever owns
that panel pastes the updated file content into the matching component there.

## How the actions behave

Clicking Activate / Suspend / Resume / Cancel / Extend / Complete / Send for
Approval / approval Approve-Decline-Request-Change all mutate the in-memory
fixture permit in `src/services/workPermitService.js`, so the page updates
realistically after each action — it just doesn't persist across a page
reload (refresh resets back to the fixture in `src/fixtures/index.js`).

## Raising a new Work Permit

"Raise Work Permit" (`NewWorkPermit.jsx`) works end-to-end with no backend:
locations, assets, vendors, employees, approval flows, and permit types +
their per-type dynamic fields (Hot Work, Cold Work, Height Work, Confined
Space) are all mocked in `src/fixtures/index.js`. Submitting the form builds
a full permit record from what you entered and makes it the active permit
(viewable right after via the list/detail pages) — nothing is sent over the
network. Add more locations/assets/vendors/permit types by editing the
fixtures file directly.
