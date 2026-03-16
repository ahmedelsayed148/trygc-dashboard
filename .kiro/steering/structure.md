# Project Structure

## Top-Level
```
pages/              # Next.js pages — only [[...slug]].tsx (SPA shell) and _app.tsx
src/                # All application source code
supabase/           # DB schema SQL and local SQLite db
public/             # Static assets
```

## src/
```
src/App.tsx                     # Thin wrapper that renders <Root />
src/routes.ts                   # Route → lazy component map; all routes registered here
src/index.css                   # Global styles and CSS variable definitions

src/components/                 # All React components
  Root.tsx                      # App shell: auth, workspace state, layout, routing
  Sidebar.tsx / TopBar.tsx / MobileBottomNav.tsx
  FeatureGate.tsx               # Wraps admin/feature-restricted content
  supabaseClient.ts             # Supabase client singleton
  ui/                           # shadcn/ui primitives (do not modify directly)
  operations/                   # Sub-components for campaign/task editors

src/context/
  AppContext.tsx                 # Secondary context (seed-data demo mode)
  AppearanceContext.tsx
  ConfigurationContext.tsx

src/lib/
  api.ts                        # apiRequest() helper for all backend calls
  navigation.ts                 # Nav items, feature ID resolution
  operations.ts                 # Campaign/task normalization helpers
  communityWorkspace.ts         # Community workspace normalization
  workspaceTools.ts             # Normalize intake/updates/widgets/handovers
  coverageTypes.ts              # Coverage record normalization
  routerCompat.tsx              # useNavigate / useLocation abstraction
  utils.ts                      # cn() and general utilities

src/types/index.ts              # All shared TypeScript types and constants
src/data/seed.ts                # Seed/demo data for all workspace modules
src/hooks/                      # Custom React hooks
src/test/                       # Vitest unit tests
```

## Key Conventions

- **Routing**: Add new routes in `src/routes.ts` using `lazyRoute()`. Never add pages to `pages/`.
- **State**: All workspace state lives in `Root.tsx` and is consumed via `useContext(AppContext)`. Each mutable field has a corresponding `update*` callback that calls `markWorkspaceDirty()`.
- **Types**: All shared types defined in `src/types/index.ts`. Use these — don't redefine inline.
- **API calls**: Always use `apiRequest()` from `src/lib/api.ts`. Never call `fetch` directly.
- **Feature gating**: Wrap admin/restricted UI in `<FeatureGate featureId="...">`.
- **Components**: One named export per file matching the filename. Use `@/` alias for imports.
- **Normalization**: Raw API data must be passed through the appropriate normalizer in `src/lib/` before being set into state.
