# TryGC OPS Command

Internal Next.js operations dashboard for campaign execution, team workflows, updates, widgets, reporting, and admin configuration.

## Stack

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- Supabase functions and project config via [`utils/supabase/info.tsx`](C:\Users\Essmats\Downloads\trygc-dashboard-master\trygc-dashboard-master\utils\supabase\info.tsx)
- Vitest for unit tests

## Local Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Project Notes

- The app uses `next-themes` with shared shell tokens defined in [`src/index.css`](C:\Users\Essmats\Downloads\trygc-dashboard-master\trygc-dashboard-master\src\index.css).
- Workspace persistence helpers live in [`src/lib/workspacePersistence.ts`](C:\Users\Essmats\Downloads\trygc-dashboard-master\trygc-dashboard-master\src\lib\workspacePersistence.ts).
- The merged update and handover workflow lives in [`src/components/UpdateOrganizer.tsx`](C:\Users\Essmats\Downloads\trygc-dashboard-master\trygc-dashboard-master\src\components\UpdateOrganizer.tsx).

## Verification

Before shipping changes, run:

```bash
npm run build
npm run test
npm run lint
```
