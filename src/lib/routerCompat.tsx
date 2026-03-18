import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type NavigateOptions = {
  replace?: boolean;
};

type ClassNameValue = string | ((state: { isActive: boolean }) => string);
type ChildrenValue = ReactNode | ((state: { isActive: boolean }) => ReactNode);

type NavLinkProps = {
  children?: ChildrenValue;
  className?: ClassNameValue;
  end?: boolean;
  onClick?: () => void;
  title?: string;
  to: string;
};

function normalizePathname(pathname: string | undefined) {
  const rawPath = (pathname || "/").split("?")[0].split("#")[0];
  if (!rawPath || rawPath === "/") {
    return "/";
  }

  return rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
}

function getIsActive(currentPath: string, targetPath: string, end?: boolean) {
  const normalizedCurrent = normalizePathname(currentPath);
  const normalizedTarget = normalizePathname(targetPath);

  if (end || normalizedTarget === "/") {
    return normalizedCurrent === normalizedTarget;
  }

  return normalizedCurrent === normalizedTarget || normalizedCurrent.startsWith(`${normalizedTarget}/`);
}

export function useNavigate() {
  const router = useRouter();

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to === -1) {
        router.back();
        return;
      }

      if (typeof window !== "undefined") {
        window.history.go(to);
      }
      return;
    }

    if (options?.replace) {
      void router.replace(to);
      return;
    }

    void router.push(to);
  };
}

export function useLocation() {
  const router = useRouter();

  return {
    pathname: normalizePathname(router.asPath || router.pathname),
  };
}

export function NavLink({ children, className, end, onClick, title, to }: NavLinkProps) {
  const router = useRouter();
  const isActive = getIsActive(router.asPath || router.pathname, to, end);
  const resolvedClassName =
    typeof className === "function" ? className({ isActive }) : className;
  const resolvedChildren =
    typeof children === "function" ? children({ isActive }) : children;

  return (
    <Link
      href={to}
      className={resolvedClassName}
      onClick={onClick}
      title={title}
      aria-current={isActive ? "page" : undefined}
    >
      {resolvedChildren}
    </Link>
  );
}
