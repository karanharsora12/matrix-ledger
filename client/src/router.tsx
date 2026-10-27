import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { BillsPage } from './pages/BillsPage';
import { CreateBillPage } from './pages/CreateBillPage';
import { BillDetailPage } from './pages/BillDetailPage';
import { LedgerPage } from './pages/LedgerPage';
import { SettingsPage } from './pages/SettingsPage';

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Index / Dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

// Customers list
const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers',
  component: CustomersPage,
});

// Customer details
const customerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers/$customerId',
  component: CustomerDetailPage,
});

// Bills list
const billsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bills',
  component: BillsPage,
});

// Create bill
const newBillRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bills/new',
  component: CreateBillPage,
});

// Bill details
const billDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bills/$billId',
  component: BillDetailPage,
});

// Ledger report
const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger',
  component: LedgerPage,
});

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  customersRoute,
  customerDetailRoute,
  newBillRoute,
  billDetailRoute,
  billsRoute,
  ledgerRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
