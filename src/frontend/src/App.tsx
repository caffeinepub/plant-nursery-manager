import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type React from "react";
import { useEffect } from "react";
import { UserRole } from "./backend";
import Layout from "./components/Layout";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserRole } from "./hooks/useQueries";

// Pages — Dashboard uses a named export
import { Dashboard } from "./pages/Dashboard";
import Expenditure from "./pages/Expenditure";
import Inventory from "./pages/Inventory";
import ManageRoles from "./pages/ManageRoles";
import PriorityRegister from "./pages/PriorityRegister";
import ProfitAnalysis from "./pages/ProfitAnalysis";
import Sales from "./pages/Sales";

const queryClient = new QueryClient();

// Route guard: redirects clerk users (UserRole.user) away from admin-only pages
function ClerkGuard({ children }: { children: React.ReactNode }) {
  const { data: userRole, isLoading } = useGetCallerUserRole();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (!identity || isLoading) return;
    if (userRole === UserRole.user) {
      navigate({ to: "/sales" });
    }
  }, [identity, isLoading, userRole, navigate]);

  if (!identity || isLoading) return <>{children}</>;
  if (userRole === UserRole.user) return null;

  return <>{children}</>;
}

// Index redirect: sends authenticated users to the right page based on role
function IndexRedirect() {
  const { identity } = useInternetIdentity();
  const { data: userRole, isLoading } = useGetCallerUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!identity) return;
    if (isLoading) return;
    if (userRole === UserRole.user) {
      navigate({ to: "/sales" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }, [identity, isLoading, userRole, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <img
          src="/assets/generated/esearth-logo.dim_400x400.png"
          alt="Esearth"
          className="w-20 h-20 rounded-full mx-auto"
        />
        <h1 className="text-2xl font-bold">Esearth Nursery Manager</h1>
        <p className="text-muted-foreground">
          {identity ? "Redirecting..." : "Please login to continue"}
        </p>
      </div>
    </div>
  );
}

// Root layout wrapping all routes
function RootLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// Route definitions
const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRedirect,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <ClerkGuard>
      <Dashboard />
    </ClerkGuard>
  ),
});

const salesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sales",
  component: Sales,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory",
  component: () => (
    <ClerkGuard>
      <Inventory />
    </ClerkGuard>
  ),
});

const expenditureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expenditure",
  component: () => (
    <ClerkGuard>
      <Expenditure />
    </ClerkGuard>
  ),
});

const profitAnalysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profit-analysis",
  component: () => (
    <ClerkGuard>
      <ProfitAnalysis />
    </ClerkGuard>
  ),
});

const manageRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage-roles",
  component: () => (
    <ClerkGuard>
      <ManageRoles />
    </ClerkGuard>
  ),
});

const priorityRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/priority-register",
  component: PriorityRegister,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  salesRoute,
  inventoryRoute,
  expenditureRoute,
  profitAnalysisRoute,
  manageRolesRoute,
  priorityRegisterRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
