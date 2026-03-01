import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
  TrendingDown,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { UserRole } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserRole } from "../hooks/useQueries";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Sales",
    path: "/sales",
    icon: <ShoppingCart className="w-5 h-5" />,
    adminOnly: false,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Package className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Expenditure",
    path: "/expenditure",
    icon: <TrendingDown className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Profit Analysis",
    path: "/profit-analysis",
    icon: <BarChart3 className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Manage Roles",
    path: "/manage-roles",
    icon: <ShieldCheck className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Priority Register",
    path: "/priority-register",
    icon: <Star className="w-5 h-5" />,
    adminOnly: false,
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { identity, clear, login, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: userRole, isLoading: roleLoading } = useGetCallerUserRole();

  // UserRole.user is the "clerk" role in the backend enum
  const isClerk = isAuthenticated && !roleLoading && userRole === UserRole.user;

  const visibleNavItems = navItems.filter((item) => {
    if (!isAuthenticated) return false;
    if (item.adminOnly && isClerk) return false;
    return true;
  });

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    setMobileOpen(false);
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: unknown) {
      const err = error as Error;
      if (err?.message === "User is already authenticated") {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  const currentYear = new Date().getFullYear();
  const appId = encodeURIComponent(
    window.location.hostname || "esearth-nursery",
  );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {roleLoading && isAuthenticated ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sidebar-foreground/60 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : (
        visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })
      )}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen fixed left-0 top-0 bottom-0 z-30">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/esearth-logo.dim_400x400.png"
              alt="Esearth Logo"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-bold text-sidebar-foreground text-sm leading-tight">
                Esearth
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                Nursery Manager
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Auth */}
        <div className="p-3 border-t border-sidebar-border">
          {isAuthenticated ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogin}
              disabled={loginStatus === "logging-in"}
            >
              {loginStatus === "logging-in" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loginStatus === "logging-in" ? "Logging in..." : "Login"}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 text-center">
            © {currentYear} Esearth
          </p>
          <p className="text-xs text-sidebar-foreground/40 text-center mt-1">
            Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-sidebar-foreground/60"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/assets/generated/esearth-logo.dim_400x400.png"
            alt="Esearth Logo"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-bold text-sidebar-foreground text-sm">
            Esearth Nursery
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((v) => !v)}
          className="text-sidebar-foreground"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop — accessible dismiss button */}
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 w-full h-full cursor-default"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileOpen(false);
            }}
          />
          <aside className="relative w-64 h-full bg-sidebar flex flex-col z-10">
            <div className="p-4 border-b border-sidebar-border flex items-center gap-3 mt-14">
              <img
                src="/assets/generated/esearth-logo.dim_400x400.png"
                alt="Esearth Logo"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-sidebar-foreground text-sm">
                  Esearth
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  Nursery Manager
                </p>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sidebar-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sidebar-foreground"
                  onClick={handleLogin}
                  disabled={loginStatus === "logging-in"}
                >
                  {loginStatus === "logging-in" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  {loginStatus === "logging-in" ? "Logging in..." : "Login"}
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="md:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
