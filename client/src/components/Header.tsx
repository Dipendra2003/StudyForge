import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Home,
  Sparkles,
  Zap,
  HelpCircle,
  Info,
  CreditCard,
  LifeBuoy,
  Mail,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onNavigate?: (section: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const isHomePage = location === "/" || location === "";
  const { user, isAuthenticated, logout } = useAuth();
  
  // Check if user is admin and currently in admin area
  const isAdminArea = location.startsWith('/admin');
  const isAdmin = user?.role === 'admin';
  const dashboardPath = (isAdmin && isAdminArea) ? '/admin' : '/dashboard';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location === '/' || location === '';
    return location === path || location.startsWith(path + '/');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/', isSection: false },
    { id: 'features', label: 'Features', icon: Sparkles, path: '/#features', isSection: true, section: 'features' },
    { id: 'benefits', label: 'Benefits', icon: Zap, path: '/#benefits', isSection: true, section: 'benefits' },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, path: '/#faq', isSection: true, section: 'faq' },
    { id: 'about', label: 'About', icon: Info, path: '/about', isSection: false },
    { id: 'pricing', label: 'Pricing', icon: CreditCard, path: '/pricing', isSection: false },
    { id: 'help', label: 'Help', icon: LifeBuoy, path: '/help', isSection: false },
    { id: 'contact', label: 'Contact', icon: Mail, path: '/contact', isSection: false },
  ];

  const handleSectionClick = (section: string) => {
    if (isHomePage && onNavigate) {
      onNavigate(section);
    } else {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={cn(
        "fixed w-full top-0 z-40 transition-all duration-300",
        isScrolled
          ? "bg-background/85 dark:bg-background/90 backdrop-blur-md shadow-xs border-b border-border/50"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold flex items-center space-x-1.5 flex-shrink-0 group">
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              Jadoo
            </span>
            <span className="text-foreground font-extrabold">2.0</span>
          </Link>

          {/* Desktop Navigation Links (hidden on mobile and tablet portrait to guarantee no horizontal overflow) */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-7" aria-label="Main Navigation">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/') ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Home
            </Link>
            {isHomePage ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSectionClick('features')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionClick('benefits')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Benefits
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionClick('faq')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  FAQ
                </button>
              </>
            ) : (
              <>
                <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Features
                </Link>
                <Link href="/#benefits" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Benefits
                </Link>
                <Link href="/#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </Link>
              </>
            )}
            <Link
              href="/about"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/about') ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/pricing') ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Pricing
            </Link>
            <Link
              href="/help"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/help') ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Help
            </Link>
            <Link
              href="/contact"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive('/contact') ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Contact
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Desktop Theme Toggle */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Desktop Auth Controls */}
            {isAuthenticated ? (
              <>
                <Link href={dashboardPath}>
                  <Button
                    size="sm"
                    className="hidden lg:inline-flex bg-primary hover:bg-primary/90 text-white font-medium rounded-full shadow-xs hover:shadow-md transition-all"
                  >
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    {(isAdmin && isAdminArea) ? 'Admin Dashboard' : 'Dashboard'}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden lg:inline-flex rounded-full hover:bg-accent"
                      aria-label="User account menu"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">
                      {user?.fullName || user?.username || "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href={dashboardPath}>
                      <DropdownMenuItem className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {(isAdmin && isAdminArea) ? 'Admin Dashboard' : 'Dashboard'}
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="hidden lg:inline-flex bg-primary hover:bg-primary/90 text-white font-medium rounded-full shadow-xs hover:shadow-md transition-all px-4"
                >
                  Get Started
                </Button>
              </Link>
            )}

            {/* Mobile & Tablet Navigation Drawer (Sheet) - Consistent with After-Login Sidebar */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-accent rounded-xl text-foreground"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] p-0 flex flex-col h-full bg-card border-r border-border shadow-2xl"
              >
                {/* Drawer Branding Header */}
                <SheetHeader className="px-6 py-4 border-b border-border/60 flex-shrink-0 text-left">
                  <SheetTitle className="text-left">
                    <Link href="/" onClick={() => setIsOpen(false)}>
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <span className="font-extrabold text-xl bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                          Jadoo
                        </span>
                        <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-bold">
                          v2.0
                        </span>
                      </div>
                    </Link>
                  </SheetTitle>
                  <SheetDescription className="text-left text-xs text-muted-foreground">
                    AI-powered study assistant
                  </SheetDescription>
                </SheetHeader>

                {/* Scrollable Navigation Items */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Mobile navigation">
                  <ul className="space-y-1" role="list">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = !item.isSection && isActive(item.path);

                      if (item.isSection) {
                        if (isHomePage) {
                          return (
                            <li key={item.id}>
                              <SheetClose asChild>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    handleSectionClick(item.section!);
                                    setIsOpen(false);
                                  }}
                                  className="w-full justify-start text-sm font-medium hover:bg-accent/80 transition-colors"
                                >
                                  <Icon className="mr-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                  <span>{item.label}</span>
                                </Button>
                              </SheetClose>
                            </li>
                          );
                        }
                        return (
                          <li key={item.id}>
                            <SheetClose asChild>
                              <Link href={item.path}>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-sm font-medium hover:bg-accent/80 transition-colors"
                                  onClick={() => setIsOpen(false)}
                                >
                                  <Icon className="mr-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                  <span>{item.label}</span>
                                </Button>
                              </Link>
                            </SheetClose>
                          </li>
                        );
                      }

                      return (
                        <li key={item.id}>
                          <SheetClose asChild>
                            <Link href={item.path}>
                              <Button
                                variant={active ? "default" : "ghost"}
                                className={cn(
                                  "w-full justify-start text-sm font-medium transition-all",
                                  active
                                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/80"
                                )}
                                onClick={() => setIsOpen(false)}
                              >
                                <Icon
                                  className={cn(
                                    "mr-3 h-4 w-4 flex-shrink-0",
                                    active ? "text-white" : "text-muted-foreground"
                                  )}
                                  aria-hidden="true"
                                />
                                <span>{item.label}</span>
                              </Button>
                            </Link>
                          </SheetClose>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Fixed Drawer Footer (Theme Toggle + Auth state) */}
                <div className="px-4 py-4 border-t border-border/60 flex-shrink-0 space-y-3 bg-card">
                  {/* Theme Switcher Row */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
                    <span className="text-xs font-semibold text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>

                  {isAuthenticated ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center px-3 py-2 bg-accent/50 rounded-lg">
                        <User className="mr-2.5 h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate text-sm">
                          {user?.fullName || user?.username || "User"}
                        </span>
                      </div>
                      <SheetClose asChild>
                        <Link href={dashboardPath}>
                          <Button className="w-full justify-start bg-primary hover:bg-primary/90 text-white font-medium shadow-sm">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            {(isAdmin && isAdminArea) ? 'Admin Dashboard' : 'Dashboard'}
                          </Button>
                        </Link>
                      </SheetClose>
                      <div className="grid grid-cols-2 gap-2">
                        <SheetClose asChild>
                          <Link href="/profile">
                            <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                              <User className="mr-1.5 h-3.5 w-3.5" />
                              Profile
                            </Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/settings">
                            <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                              <Settings className="mr-1.5 h-3.5 w-3.5" />
                              Settings
                            </Button>
                          </Link>
                        </SheetClose>
                      </div>
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                          onClick={() => {
                            logout();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </Button>
                      </SheetClose>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <SheetClose asChild>
                        <Link href="/login">
                          <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-md">
                            Get Started
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/login">
                          <Button variant="outline" className="w-full font-medium">
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
