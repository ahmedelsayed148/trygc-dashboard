import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type RouteComponent = LazyExoticComponent<ComponentType>;

function lazyRoute<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  load: () => Promise<TModule>,
  exportName: TKey,
): RouteComponent {
  return lazy(async () => {
    const module = await load();

    return {
      default: module[exportName] as ComponentType,
    };
  });
}

const NotFound = lazyRoute(() => import("./components/NotFound"), "NotFound");

const routeComponents: Record<string, RouteComponent> = {
  "/": lazyRoute(() => import("./components/Dashboard"), "Dashboard"),
  "/analytics": lazyRoute(() => import("./components/Analytics"), "Analytics"),
  "/archive": lazyRoute(() => import("./components/Archive"), "Archive"),
  "/campaigns": lazyRoute(() => import("./components/CampaignsManager"), "CampaignsManager"),
  "/campaign-overview": lazyRoute(() => import("./components/CampaignOverview"), "CampaignOverview"),
  "/campaign-intake": lazyRoute(() => import("./components/CampaignIntake"), "CampaignIntake"),
  "/community-team": lazyRoute(() => import("./components/CommunityTeam"), "CommunityTeam"),
  "/data-export": lazyRoute(() => import("./components/DataExport"), "DataExport"),
  "/data-import": lazyRoute(() => import("./components/DataImport"), "DataImport"),
  "/demo": lazyRoute(() => import("./components/PlatformDemo"), "PlatformDemo"),
  "/functions": lazyRoute(() => import("./components/FunctionKanban"), "FunctionKanban"),
  "/handover": lazyRoute(() => import("./components/HandoverBoard"), "HandoverBoard"),
  "/member-views": lazyRoute(() => import("./components/MemberViews"), "MemberViews"),
  "/mistakes": lazyRoute(() => import("./components/MistakeLogger"), "MistakeLogger"),
  "/personal": lazyRoute(() => import("./components/PersonalDashboardRoute"), "PersonalDashboard"),
  "/reports": lazyRoute(() => import("./components/Reports"), "Reports"),
  "/configuration": lazyRoute(() => import("./components/ConfigurationManager"), "ConfigurationManager"),
  "/settings": lazyRoute(() => import("./components/Settings"), "Settings"),
  "/successes": lazyRoute(() => import("./components/SuccessesFeed"), "SuccessesFeed"),
  "/tasks": lazyRoute(() => import("./components/AllTasks"), "AllTasks"),
  "/tasks-daily-routines": lazyRoute(
    () => import("./components/TasksDailyRoutines"),
    "TasksDailyRoutines",
  ),
  "/update-organizer": lazyRoute(() => import("./components/UpdateOrganizer"), "UpdateOrganizer"),
  "/user-management": lazyRoute(() => import("./components/UserManagementRoute"), "UserManagementRoute"),
  "/widgets": lazyRoute(() => import("./components/WidgetsBoard"), "WidgetsBoard"),
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
