# Tech Stack

## Framework & Runtime
- **Next.js** (v16) with React 18, TypeScript 5, strict mode off
- Pages router via `pages/[[...slug]].tsx` — all routes handled client-side by the SPA shell
- Path alias: `@/*` → `./src/*`

## Styling
- Tailwind CSS v3 with `tailwindcss-animate`
- CSS variables for all theme tokens (colors, radius, spacing) — never hardcode hex values
- Dark mode via `class` strategy (`next-themes`)
- Font: Inter
- Custom CSS variables: `--app-card-radius`, `--app-card-radius-sm`, `--app-mobile-nav-height`

## UI Components
- **shadcn/ui** component library in `src/components/ui/` (Radix UI primitives + CVA)
- **lucide-react** for icons
- **framer-motion** for animations
- **sonner** for toast notifications
- **recharts** for charts
- **react-hook-form** + **zod** for forms and validation
- **cmdk** for the command palette
- **date-fns** for date utilities
- **xlsx** for spreadsheet import/export

## State & Data
- Global app state via React Context (`AppContext`) in `src/components/Root.tsx` — passed as a single context value object
- `useContext(AppContext)` to consume state in any component
- **TanStack Query** available for server data fetching
- **Supabase** (`@supabase/supabase-js`) for auth and backend — client in `src/components/supabaseClient.ts`
- Backend API calls via `src/lib/api.ts` → Supabase Edge Function (`make-server-b626472b`)
- Local storage fallback for: campaignIntakes, organizedUpdates, linkWidgets, shiftHandovers, coverageRecords
- Debounced auto-save (900ms) syncs dirty workspace state to backend

## Testing
- **Vitest** with jsdom and `@testing-library/react`
- **Playwright** for e2e tests
- Test files in `src/test/`

## Common Commands
```bash
npm run dev        # Start dev server (Next.js)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run Vitest (single pass)
npm run test:watch # Vitest in watch mode
```
