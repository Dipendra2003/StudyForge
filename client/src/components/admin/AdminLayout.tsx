import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Users,
  FileText,
  BarChart3,
  Activity,
  Mail,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
  LayoutDashboard,
  Settings,
  User as UserIcon,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;
}

const navLinks: NavItem[] = [
  { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin', description: 'Executive summary and quick controls' },
  { id: 'users', label: 'User Governance', icon: Users, path: '/admin/users', description: 'Manage accounts, roles, and active sessions' },
  { id: 'content', label: 'Content Moderation', icon: FileText, path: '/admin/content', description: 'Toxicity scans and content moderation' },
  { id: 'analytics', label: 'Platform Analytics', icon: BarChart3, path: '/admin/analytics', description: 'User growth and engagement telemetry' },
  { id: 'monitoring', label: 'System Monitoring', icon: Activity, path: '/admin/monitoring', description: 'AI quotas, latencies, and error logs' },
  { id: 'email', label: 'Helpdesk & Broadcasts', icon: Mail, path: '/admin/email', description: 'Support ticket resolution and email campaigns' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const { activeSection, setActiveSection } = useAdmin();
  const [location, setLocation] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Update active section based on current route
  React.useEffect(() => {
    const path = location.split('/')[2]; // Get section from /admin/section
    if (path && ['users', 'content', 'analytics', 'monitoring', 'email'].includes(path)) {
      setActiveSection(path as any);
    }
  }, [location, setActiveSection]);

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location === '/admin' || location === '/admin/';
    }
    return location === path || location.startsWith(path + '/');
  };

  const getHeaderMeta = () => {
    if (location === '/admin/profile' || location.startsWith('/admin/profile')) {
      return { label: 'Admin Profile', icon: UserIcon, description: 'Administrator identity & account security management' };
    }
    if (location === '/admin/settings' || location.startsWith('/admin/settings')) {
      return { label: 'System Settings', icon: Settings, description: 'AI token quotas, moderation sensitivity, and maintenance toggles' };
    }
    return navLinks.find(link => isActive(link.path)) || navLinks[0];
  };

  const activeNav = getHeaderMeta();

  return (
    <div className="h-screen bg-gradient-to-br from-background via-muted/10 to-background flex overflow-hidden">
      {/* Sidebar for desktop - Fixed collapsible position */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarCollapsed ? '80px' : '272px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r border-border/60 bg-card/95 backdrop-blur-md relative h-screen z-40 shadow-xl"
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-accent text-foreground hover:scale-110 transition-all"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isSidebarCollapsed}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>

        {/* Logo Branding */}
        <div className={cn('p-6 transition-all border-b border-border/40', isSidebarCollapsed && 'px-4 py-6')}>
          <Link href="/admin">
            <div className="flex items-center space-x-3 cursor-pointer group">
              <AnimatePresence mode="wait">
                {isSidebarCollapsed ? (
                  <motion.div
                    key="collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-violet-600 shadow-md text-white font-bold group-hover:shadow-primary/50 transition-all mx-auto"
                    title="StudyForge Enterprise Admin"
                  >
                    <Shield className="h-6 w-6 animate-pulse" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-black text-xl tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent block leading-tight truncate">
                        StudyForge
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-primary to-indigo-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                          Admin
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">v2.0</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        {/* Navigation - Scrollable area with custom styling */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-muted-foreground/20" aria-label="Admin Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link key={link.id} href={link.path}>
                <Button
                  variant={active ? 'default' : 'ghost'}
                  className={cn(
                    'w-full transition-all duration-200 hover:scale-[1.02] active:scale-95 h-11 font-medium text-sm rounded-xl',
                    isSidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3.5',
                    active
                      ? 'bg-gradient-to-r from-primary via-indigo-600 to-primary/95 text-white shadow-md shadow-primary/25 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/70 dark:hover:bg-muted/40'
                  )}
                  title={isSidebarCollapsed ? `${link.label} - ${link.description}` : undefined}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform', !isSidebarCollapsed && 'mr-3', active && 'scale-110')} />
                  <AnimatePresence>
                    {!isSidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 text-left truncate overflow-hidden"
                      >
                        <span className="truncate block">{link.label}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!isSidebarCollapsed && active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-2" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Quick Student App Switcher (Expanded only) */}
        <AnimatePresence>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-3"
            >
              <Link href="/dashboard">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-indigo-500/10 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
                      <span className="text-xs font-bold text-foreground">Student Portal</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    Switch to student interactive learning experience
                  </p>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Profile Footer - Fixed at bottom */}
        <div className="p-3 border-t border-border/60 bg-muted/20 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full hover:bg-accent/80 transition-all h-14 rounded-xl px-2',
                  isSidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
                  {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                {!isSidebarCollapsed && (
                  <div className="ml-3 min-w-0 flex-1 text-left">
                    <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                      {user?.fullName || user?.username || 'System Admin'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">
                        System Admin
                      </span>
                    </div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl p-2 shadow-xl border-border/80">
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-foreground leading-none">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'admin@studyforge.edu'}
                  </p>
                  <Badge variant="outline" className="w-fit mt-1.5 text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                    System Administrator
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/dashboard">
                <DropdownMenuItem className="cursor-pointer font-medium py-2 rounded-lg">
                  <ExternalLink className="mr-2.5 h-4 w-4 text-primary" />
                  <span>Switch to Student App</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/profile">
                <DropdownMenuItem className="cursor-pointer font-medium py-2 rounded-lg">
                  <UserIcon className="mr-2.5 h-4 w-4 text-indigo-500" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/settings">
                <DropdownMenuItem className="cursor-pointer font-medium py-2 rounded-lg">
                  <Settings className="mr-2.5 h-4 w-4 text-violet-500" />
                  <span>Admin Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10 font-bold py-2 rounded-lg"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Main content area - Takes remaining space */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header for mobile and desktop */}
        <header className="border-b border-border/60 px-4 sm:px-6 py-3 bg-card/90 backdrop-blur-md flex-shrink-0 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu sheet trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden hover:bg-accent rounded-xl" aria-label="Open menu">
                    <Menu className="h-6 w-6" aria-hidden="true" />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0 flex flex-col h-full bg-card">
                  <SheetHeader className="px-6 py-5 border-b border-border/40 text-left">
                    <SheetTitle>
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-lg text-foreground block leading-tight">StudyForge</span>
                          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Enterprise Admin</span>
                        </div>
                      </div>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground pt-1">
                      Full system analytics and student governance
                    </SheetDescription>
                  </SheetHeader>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 overflow-y-auto p-4 space-y-1.5" aria-label="Mobile Navigation">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      const active = isActive(link.path);
                      return (
                        <SheetClose asChild key={link.id}>
                          <Link href={link.path}>
                            <Button
                              variant={active ? 'default' : 'ghost'}
                              className={cn(
                                'w-full justify-start h-11 font-semibold rounded-xl',
                                active
                                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                              )}
                            >
                              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                              <span>{link.label}</span>
                            </Button>
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>

                  {/* Mobile Profile Footer */}
                  <div className="p-4 border-t border-border/40 bg-muted/10 space-y-2">
                    <div className="flex items-center px-3 py-2.5 bg-accent/40 rounded-xl mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs mr-3">
                        {user?.username?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-sm text-foreground">{user?.fullName || user?.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Link href="/admin/profile">
                        <Button variant="ghost" className="w-full justify-start rounded-xl text-xs font-semibold">
                          <UserIcon className="mr-2 h-4 w-4 text-indigo-500" />
                          Admin Profile
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/admin/settings">
                        <Button variant="ghost" className="w-full justify-start rounded-xl text-xs font-semibold">
                          <Settings className="mr-2 h-4 w-4 text-violet-500" />
                          System Settings
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/dashboard">
                        <Button variant="outline" className="w-full justify-start rounded-xl text-xs font-semibold">
                          <ExternalLink className="mr-2 h-4 w-4 text-primary" />
                          Switch to Student Portal
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl text-xs font-bold"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Page Section Branding */}
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                  {activeNav && React.createElement(activeNav.icon, { className: 'h-4 w-4' })}
                </span>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-foreground leading-none tracking-tight">
                    {activeNav?.label || 'Administration'}
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block mt-0.5 font-medium">
                    {activeNav?.description || 'Enterprise Management Portal'}
                  </p>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live Status Pulse */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">System Normal</span>
              </div>

              {/* Switcher button on desktop header */}
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex items-center gap-2 rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 font-semibold transition-all shadow-xs text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Student View</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>

              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6 md:p-8" role="main">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
