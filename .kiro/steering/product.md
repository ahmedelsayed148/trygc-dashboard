# Product: Trygc OPS Command

An internal operations command center for a campaign/influencer marketing team. It is a role-based workspace — not a generic task app — where admins and members manage campaigns, tasks, community workflows, coverage tracking, shift handovers, updates, reporting, and admin configuration.

## Core Modules
- Dashboard, Personal Dashboard
- Campaigns & Campaign Intake
- All Tasks, Function Kanban
- Community Team (by market: SA, UAE, Kuwait, Egypt)
- Coverage Board
- Widgets (shared quick-links)
- Mistake Logger, Successes Feed
- Update Organizer (Arabic → English translation + structured output)
- Handover Builder
- Team Analytics, Member Views, Reports, Archive
- User Management, Configuration Manager
- Data Export / Import
- Platform Demo (first-time onboarding walkthrough)
- Command Palette (Ctrl/Cmd+K)

## Roles
- `owner` — permanent full access, protected email
- `admin` — broad access including all admin-only modules
- `member` — personal/core operational access only

Feature access is per-user and controlled via `userFeatures` array. `FeatureGate` component enforces access in the UI.

## Visual Direction
Premium black/white/zinc monochrome aesthetic. Bold typography, large rounded cards, subtle motion. Serious ops-tool feel — not consumer SaaS. Supports light and dark mode.
