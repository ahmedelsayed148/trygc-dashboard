import type { ReactNode } from "react";
import {
  NavLink as RouterNavLink,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
} from "react-router-dom";

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
  to: string;
};

export function useNavigate() {
  const navigate = useRouterNavigate();

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to === -1) {
        navigate(-1);
        return;
      }

      window.history.go(to);
      return;
    }

    navigate(to, { replace: options?.replace });
  };
}

export function useLocation() {
  const location = useRouterLocation();
  return { pathname: location.pathname };
}

export function NavLink({ children, className, end, onClick, to }: NavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={(state) =>
        typeof className === "function" ? className({ isActive: state.isActive }) : className
      }
    >
      {(state) =>
        typeof children === "function" ? children({ isActive: state.isActive }) : children
      }
    </RouterNavLink>
  );
}
