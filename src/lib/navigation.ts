import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ClipboardList,
  Languages,
  Link2,
  Download,
  Eye,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  PieChart,
  Settings,
  SlidersHorizontal,
  Target,
  Trophy,
  Upload,
  User,
  Users,
} from "lucide-react";

export interface NavItem {
  badge?: string;
  description: string;
  end?: boolean;
  icon: LucideIcon;
  id: string;
  label: string;
  to: string;
}

export const FEATURE_NAV_MAP: Record<string, NavItem> = {
  dashboard: {
    id: "dashboard",
    to: "/",
    label: "Dashboard",
    description: "Live workspace overview, health, and key actions.",
    icon: LayoutDashboard,
    end: true,
  },
  personal: {
    id: "personal",
    to: "/personal",
    label: "My Dashboard",
    description: "Your personal workload, performance, and assigned tasks.",
    icon: User,
  },
  "community-team": {
    id: "community-team",
    to: "/community-team",
    label: "Community Team",
    description: "Track community assignments, managers, and checklist coverage.",
    icon: Globe,
  },
  widgets: {
    id: "widgets",
    to: "/widgets",
    label: "Widgets",
    description: "Custom link widgets for your most important URLs and workspaces.",
    icon: Link2,
  },
  tasks: {
    id: "tasks",
    to: "/tasks",
    label: "All Tasks",
    description: "Master task list across campaigns, assignees, and status.",
    icon: ClipboardList,
  },
  "tasks-daily-routines": {
    id: "tasks-daily-routines",
    to: "/tasks-daily-routines",
    label: "Tasks & Daily Routines",
    description: "Priority tasks and the operating routines the team should clear every day.",
    icon: ClipboardList,
  },
  campaigns: {
    id: "campaigns",
    to: "/campaigns",
    label: "Campaigns",
    description: "Lifecycle management for campaigns across every phase.",
    icon: Target,
  },
  "campaign-overview": {
    id: "campaign-overview",
    to: "/campaign-overview",
    label: "Campaign Overview",
    description: "Live analytics and performance overview of all active campaigns.",
    icon: PieChart,
  },
  "campaign-intake": {
    id: "campaign-intake",
    to: "/campaign-intake",
    label: "Campaign Intake",
    description: "Add upcoming or ongoing campaigns and push them into the workspace.",
    icon: Target,
  },
  mistakes: {
    id: "mistakes",
    to: "/mistakes",
    label: "Mistake Logger",
    description: "Capture, resolve, and learn from execution issues.",
    icon: AlertTriangle,
  },
  "update-organizer": {
    id: "update-organizer",
    to: "/update-organizer",
    label: "Update Organizer",
    description: "Turn messy updates into structured English summaries and action items.",
    icon: Languages,
  },
  handover: {
    id: "handover",
    to: "/handover",
    label: "Handover",
    description: "Write detailed shift handovers so the next shift and the full team stay aligned.",
    icon: MessageCircle,
  },
  functions: {
    id: "functions",
    to: "/functions",
    label: "Function Kanban",
    description: "Cross-functional task view by team and workflow stage.",
    icon: LayoutGrid,
  },
  analytics: {
    id: "analytics",
    to: "/analytics",
    label: "Team Analytics",
    description: "Performance trends, completion rates, and team insights.",
    icon: BarChart3,
  },
  "member-views": {
    id: "member-views",
    to: "/member-views",
    label: "Member Views",
    description: "Role-based views for individual contributors and teams.",
    icon: Eye,
  },
  successes: {
    id: "successes",
    to: "/successes",
    label: "Updates",
    description: "Wins, progress updates, and shared team momentum.",
    icon: Trophy,
  },
  reports: {
    id: "reports",
    to: "/reports",
    label: "Reports",
    description: "Structured output for leadership, QA, and performance review.",
    icon: FileText,
  },
  archive: {
    id: "archive",
    to: "/archive",
    label: "Archive",
    description: "Historical records and completed work snapshots.",
    icon: Archive,
  },
  "user-management": {
    id: "user-management",
    to: "/user-management",
    label: "User Mgmt",
    description: "Roles, access, and per-user workspace controls.",
    icon: Users,
  },
  "data-export": {
    id: "data-export",
    to: "/data-export",
    label: "Data Export",
    description: "Backup and export the current workspace state.",
    icon: Download,
  },
  "data-import": {
    id: "data-import",
    to: "/data-import",
    label: "Data Import",
    description: "Restore or migrate workspace data safely.",
    icon: Upload,
  },
  settings: {
    id: "settings",
    to: "/settings",
    label: "Settings",
    description: "Profile, appearance, notifications, and admin settings.",
    icon: Settings,
  },
  configuration: {
    id: "configuration",
    to: "/configuration",
    label: "Configuration",
    description: "System, campaign, team, and feature flag configuration.",
    icon: SlidersHorizontal,
  },
};

export const DEFAULT_ADMIN_FEATURES = [
  "dashboard",
  "community-team",
  "widgets",
  "tasks",
  "tasks-daily-routines",
  "campaigns",
  "campaign-overview",
  "campaign-intake",
  "mistakes",
  "update-organizer",
  "handover",
  "functions",
  "analytics",
  "member-views",
  "successes",
  "reports",
  "archive",
  "settings",
  "configuration",
  "user-management",
  "data-export",
  "data-import",
];

export const DEFAULT_MEMBER_FEATURES = [
  "personal",
  "community-team",
  "widgets",
  "tasks-daily-routines",
  "campaigns",
  "mistakes",
  "update-organizer",
  "handover",
  "successes",
  "settings",
];

export const FEATURE_ORDER = [
  "dashboard",
  "personal",
  "community-team",
  "widgets",
  "tasks",
  "tasks-daily-routines",
  "campaign-overview",
  "campaigns",
  "campaign-intake",
  "mistakes",
  "update-organizer",
  "handover",
  "functions",
  "analytics",
  "member-views",
  "successes",
  "reports",
  "archive",
  "user-management",
  "data-export",
  "data-import",
  "settings",
  "configuration",
];

export const NAV_SECTIONS = [
  { label: "Core", items: ["/", "/personal", "/community-team", "/widgets"] },
  { label: "Operations", items: ["/campaign-overview", "/campaigns", "/campaign-intake", "/tasks", "/tasks-daily-routines", "/mistakes", "/update-organizer", "/handover", "/functions"] }, // campaign-overview is intentionally first
  { label: "Insights", items: ["/analytics", "/member-views", "/successes", "/reports", "/archive"] },
  { label: "Admin", items: ["/user-management", "/data-export", "/data-import", "/settings", "/configuration"] },
];

export const ALWAYS_AVAILABLE_FEATURES = ["widgets"] as const;

const OWNER_EMAIL = "ahmedlalatoo2013@gmail.com";

const LEGACY_FEATURE_MAP: Record<string, string[]> = {
  ops: ["campaigns"],
  "shift-tasks": ["campaigns", "community-team", "mistakes"],
  "campaign-tasks": ["campaigns"],
  community: ["community-team"],
  "upload-xlsx": [],
  "meeting-minutes": [],
};

function normalizeRequestedFeatures(featureIds: string[]) {
  const normalized = new Set<string>();

  featureIds.forEach((featureId) => {
    const mapped = LEGACY_FEATURE_MAP[featureId];

    if (mapped) {
      mapped.forEach((nextId) => normalized.add(nextId));
      return;
    }

    if (FEATURE_NAV_MAP[featureId]) {
      normalized.add(featureId);
    }
  });

  return [...normalized];
}

export function resolveFeatureIds({
  isAdmin,
  userEmail,
  userFeatures,
}: {
  isAdmin: boolean;
  userEmail: string;
  userFeatures: string[] | null;
}) {
  const isOwner = userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const requestedFeatures = isOwner
    ? FEATURE_ORDER
    : userFeatures || (isAdmin ? DEFAULT_ADMIN_FEATURES : DEFAULT_MEMBER_FEATURES);

  const normalizedFeatures = normalizeRequestedFeatures(
    isAdmin && !requestedFeatures.includes("user-management")
      ? [...requestedFeatures, "user-management", ...ALWAYS_AVAILABLE_FEATURES]
      : [...requestedFeatures, ...ALWAYS_AVAILABLE_FEATURES],
  );

  return FEATURE_ORDER.filter((featureId) => normalizedFeatures.includes(featureId));
}

export function getVisibleNavItems({
  isAdmin,
  userEmail,
  userFeatures,
}: {
  isAdmin: boolean;
  userEmail: string;
  userFeatures: string[] | null;
}) {
  return resolveFeatureIds({ isAdmin, userEmail, userFeatures })
    .map((featureId) => FEATURE_NAV_MAP[featureId])
    .filter(Boolean);
}

export function getCurrentNavItem(pathname: string) {
  const items = Object.values(FEATURE_NAV_MAP).sort((left, right) => right.to.length - left.to.length);
  const exactMatch = items.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );

  if (exactMatch) {
    return exactMatch;
  }

  return FEATURE_NAV_MAP.dashboard;
}
