import type { ComponentType } from "react";

import { AllTasks } from "./components/AllTasks";
import { Analytics } from "./components/Analytics";
import { Archive } from "./components/Archive";
import { CampaignIntake } from "./components/CampaignIntake";
import { CampaignsManager } from "./components/CampaignsManager";
import { CommunityTeam } from "./components/CommunityTeam";
import { CoverageBoard } from "./components/CoverageBoard";
import { Dashboard } from "./components/Dashboard";
import { DataExport } from "./components/DataExport";
import { DataImport } from "./components/DataImport";
import { FunctionKanban } from "./components/FunctionKanban";
import { HandoverBoard } from "./components/HandoverBoard";
import { MemberViews } from "./components/MemberViews";
import { MistakeLogger } from "./components/MistakeLogger";
import { NotFound } from "./components/NotFound";
import { PersonalDashboard } from "./components/PersonalDashboardRoute";
import { PlatformDemo } from "./components/PlatformDemo";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { SuccessesFeed } from "./components/SuccessesFeed";
import { UpdateOrganizer } from "./components/UpdateOrganizer";
import { UserManagementRoute } from "./components/UserManagementRoute";
import { WidgetsBoard } from "./components/WidgetsBoard";

const routeComponents: Record<string, ComponentType> = {
  "/": Dashboard,
  "/analytics": Analytics,
  "/archive": Archive,
  "/campaigns": CampaignsManager,
  "/campaign-intake": CampaignIntake,
  "/coverage": CoverageBoard,
  "/community-team": CommunityTeam,
  "/data-export": DataExport,
  "/data-import": DataImport,
  "/demo": PlatformDemo,
  "/functions": FunctionKanban,
  "/handover": HandoverBoard,
  "/member-views": MemberViews,
  "/mistakes": MistakeLogger,
  "/personal": PersonalDashboard,
  "/reports": Reports,
  "/settings": Settings,
  "/successes": SuccessesFeed,
  "/tasks": AllTasks,
  "/update-organizer": UpdateOrganizer,
  "/user-management": UserManagementRoute,
  "/widgets": WidgetsBoard,
};

const routeRedirects: Record<string, string> = {
  "/ops": "/campaigns",
};

function normalizePathname(pathname: string | null | undefined) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getRouteRedirect(pathname: string | null | undefined) {
  return routeRedirects[normalizePathname(pathname)] ?? null;
}

export function getRouteComponent(pathname: string | null | undefined) {
  const normalizedPathname = normalizePathname(pathname);
  return routeComponents[normalizedPathname] ?? NotFound;
}
