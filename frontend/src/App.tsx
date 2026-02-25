import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { Expenditure } from './pages/Expenditure';
import { ProfitAnalysis } from './pages/ProfitAnalysis';
import { Billing } from './pages/Billing';
import { InvoiceView } from './pages/InvoiceView';

// Root route with Layout wrapper
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const salesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales',
  component: Sales,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: Inventory,
});

const expenditureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/expenditure',
  component: Expenditure,
});

const profitAnalysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profit-analysis',
  component: ProfitAnalysis,
});

const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing',
  component: Billing,
});

const invoiceViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoice/$invoiceNumber',
  component: InvoiceView,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  salesRoute,
  inventoryRoute,
  expenditureRoute,
  profitAnalysisRoute,
  billingRoute,
  invoiceViewRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
