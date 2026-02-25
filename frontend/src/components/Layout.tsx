import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  TrendingUp,
  FileText,
  Leaf,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Sales', path: '/sales', icon: ShoppingCart },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Expenditure', path: '/expenditure', icon: Receipt },
  { title: 'Profit Analysis', path: '/profit-analysis', icon: TrendingUp },
  { title: 'Billing', path: '/billing', icon: FileText },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { login, clear, loginStatus, identity, isLoggingIn } = useInternetIdentity();

  const isAuthenticated = !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
    : null;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/generated/nursery-logo.dim_256x256.png"
                alt="Plant Nursery Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML =
                      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';
                  }
                }}
              />
            </div>
            <div>
              <h1 className="font-display text-sidebar-foreground font-bold text-base leading-tight">
                Green Roots
              </h1>
              <p className="text-sidebar-foreground/60 text-xs">Nursery Manager</p>
            </div>
          </div>
        </SidebarHeader>

        <Separator className="bg-sidebar-border" />

        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-4 py-2">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="mx-2 rounded-lg transition-all duration-150"
                      >
                        <Link
                          to={item.path}
                          className={
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                              : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-3">
          <Separator className="bg-sidebar-border" />

          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-sidebar-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sidebar-foreground/50 text-xs leading-none mb-0.5">Logged in as</p>
                  <p className="text-sidebar-foreground text-xs font-mono font-medium truncate" title={principal ?? ''}>
                    {shortPrincipal}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => clear()}
              >
                <LogOut className="w-3 h-3 mr-1.5" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs"
              onClick={() => login()}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <span className="w-3 h-3 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  Connecting…
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3 mr-1.5" />
                  Login with Internet Identity
                </>
              )}
            </Button>
          )}

          <div className="flex items-center gap-2 text-sidebar-foreground/40 text-xs pt-1">
            <Leaf className="w-3 h-3" />
            <span>Plant Nursery Manager</span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 no-print">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {navItems.find((n) => n.path === location.pathname)?.title ?? 'Plant Nursery Manager'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        <footer className="border-t border-border bg-card/30 px-6 py-3 text-center text-xs text-muted-foreground no-print">
          <span>© {new Date().getFullYear()} Green Roots Nursery · Built with </span>
          <span className="text-terracotta">♥</span>
          <span> using </span>
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'plant-nursery-manager')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
