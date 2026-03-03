import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
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
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePinRole } from "../hooks/usePinRole";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    ownerOnly: true,
  },
  {
    label: "Sales",
    path: "/sales",
    icon: <ShoppingCart className="w-5 h-5" />,
    ownerOnly: false,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Package className="w-5 h-5" />,
    ownerOnly: false,
  },
  {
    label: "Expenditure",
    path: "/expenditure",
    icon: <TrendingDown className="w-5 h-5" />,
    ownerOnly: true,
  },
  {
    label: "Profit Analysis",
    path: "/profit-analysis",
    icon: <BarChart3 className="w-5 h-5" />,
    ownerOnly: true,
  },
  {
    label: "Manage Roles",
    path: "/manage-roles",
    icon: <ShieldCheck className="w-5 h-5" />,
    ownerOnly: true,
  },
  {
    label: "Priority Register",
    path: "/priority-register",
    icon: <Star className="w-5 h-5" />,
    ownerOnly: false,
  },
  {
    label: "Daily Checklist",
    path: "/daily-checklist",
    icon: <ClipboardList className="w-5 h-5" />,
    ownerOnly: false,
  },
];

// ─── PIN Modal ─────────────────────────────────────────────────────────────────
function PinModal({ onSuccess }: { onSuccess: () => void }) {
  const { submitPin } = usePinRole();
  const [selectedRole, setSelectedRole] = useState<"owner" | "clerk" | null>(
    null,
  );
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedRole) {
      setTimeout(() => pinRef.current?.focus(), 50);
    }
  }, [selectedRole]);

  const handleSubmit = () => {
    if (!selectedRole) return;
    const ok = submitPin(pin, selectedRole);
    if (ok) {
      onSuccess();
    } else {
      setError("Incorrect PIN. Please try again.");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 space-y-6 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
        style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        data-ocid="pin.modal"
      >
        {/* Logo + Title */}
        <div className="text-center space-y-2">
          <img
            src="/assets/generated/esearth-logo.dim_400x400.png"
            alt="Esearth"
            className="w-16 h-16 rounded-full mx-auto object-cover shadow"
          />
          <h2 className="text-xl font-bold text-foreground">Welcome Back</h2>
          <p className="text-sm text-muted-foreground">
            Select your role to continue
          </p>
        </div>

        {/* Role Selection */}
        {!selectedRole ? (
          <div className="grid grid-cols-2 gap-3" data-ocid="pin.role.select">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("owner");
                setError("");
              }}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              data-ocid="pin.owner.button"
            >
              <ShieldCheck className="w-8 h-8 text-primary" />
              <span className="font-semibold text-sm">Owner</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole("clerk");
                setError("");
              }}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              data-ocid="pin.clerk.button"
            >
              <ShoppingCart className="w-8 h-8 text-primary" />
              <span className="font-semibold text-sm">Clerk</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back + Role label */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setPin("");
                  setError("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
                data-ocid="pin.back.button"
              >
                ← Back
              </button>
              <span className="text-sm font-medium capitalize text-primary ml-auto">
                {selectedRole} Login
              </span>
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="pin-input">Enter PIN</Label>
              <div className="relative">
                <Input
                  id="pin-input"
                  ref={pinRef}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  placeholder="••••"
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="text-center text-2xl tracking-[0.5em] pr-10"
                  data-ocid="pin.input"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  data-ocid="pin.toggle"
                >
                  {showPin ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error && (
                <p
                  className="text-sm text-destructive"
                  data-ocid="pin.error_state"
                >
                  {error}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={pin.length < 4}
              data-ocid="pin.submit_button"
            >
              Continue
            </Button>
          </div>
        )}
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { identity, clear, login, loginStatus } = useInternetIdentity();
  const { appRole, clearRole, triggerPinModal, showPinModal } = usePinRole();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const [mobileOpen, setMobileOpen] = useState(false);

  // After II login completes, if no PIN role chosen yet → show PIN modal
  useEffect(() => {
    if (isAuthenticated && appRole === null) {
      triggerPinModal();
    }
  }, [isAuthenticated, appRole, triggerPinModal]);

  const isClerk = appRole === "clerk";
  const isOwner = appRole === "owner";

  const visibleNavItems = navItems.filter((item) => {
    if (!isAuthenticated || appRole === null) return false;
    if (item.ownerOnly && isClerk) return false;
    return true;
  });

  const handleLogout = async () => {
    await clear();
    clearRole();
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
        clearRole();
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
      {visibleNavItems.map((item) => {
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
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* PIN Modal */}
      {showPinModal && isAuthenticated && <PinModal onSuccess={() => {}} />}

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

        {/* Role badge */}
        {appRole && (
          <div className="px-4 py-2 border-b border-sidebar-border">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isOwner ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {isOwner ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <ShoppingCart className="w-3 h-3" />
              )}
              {isOwner ? "Owner" : "Clerk"}
            </span>
          </div>
        )}

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
          {/* Backdrop */}
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
            {appRole && (
              <div className="px-4 py-2 border-b border-sidebar-border">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isOwner ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {isOwner ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <ShoppingCart className="w-3 h-3" />
                  )}
                  {isOwner ? "Owner" : "Clerk"}
                </span>
              </div>
            )}
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
