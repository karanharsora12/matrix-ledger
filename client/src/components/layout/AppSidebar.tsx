import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  Receipt,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Repairing Bills', href: '/bills', icon: Receipt },
  { label: 'Ledger Report', href: '/ledger', icon: BookOpen },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 select-none z-30',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* ── Absolute Floating Collapse / Expand Button on Right Edge ── */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            className="absolute -right-3.5 top-4 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        </TooltipContent>
      </Tooltip>

      {/* ── Top Header: Brand Icon & Title ── */}
      <div
        className={cn(
          'h-14 border-b border-sidebar-border flex items-center px-4 shrink-0',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-sm">
            ML
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight truncate">
              Matrix Ledger
            </span>
          )}
        </Link>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);

          const linkElement = (
            <Link
              to={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground'
                )}
              />

              {!collapsed && (
                <span className="truncate tracking-tight">{label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={href} delayDuration={100}>
                <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={href}>{linkElement}</div>;
        })}
      </nav>

      {/* ── Settings at Bottom ── */}
      <div className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={cn(
                  'flex items-center justify-center w-10 h-10 mx-auto rounded-md text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors',
                  isActive('/settings') && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                )}
                aria-label="Settings"
              >
                <Settings className={cn(
                  'h-4 w-4',
                  isActive('/settings') ? 'text-primary' : 'text-muted-foreground'
                )} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/settings"
            className={cn(
              'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isActive('/settings')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Settings className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive('/settings') ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
            )} />
            <span className="truncate tracking-tight">Settings</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
