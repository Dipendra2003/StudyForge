import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "../theme-toggle";
import {
  Home,
  BookOpen,
  FileText,
  MessageSquare,
  Code,
  Calendar,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Settings,
  LayoutDashboard,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Define the DashboardLayout props type
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Navigation links config
  const navLinks = [
    { icon: Home, label: "Home", path: "/" },
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Chat Assistant", path: "/chat" },
    { icon: FileText, label: "Document Summarization", path: "/document-summarization" },
    { icon: BookOpen, label: "Flashcards", path: "/flashcards" },
    { icon: ClipboardList, label: "Quiz Mode", path: "/quiz-mode" },
    { icon: Code, label: "Code Generator", path: "/code-generator" },
    { icon: Calendar, label: "Study Planner", path: "/study-planner" },
    { icon: ImageIcon, label: "Media Gallery", path: "/media" },
  ];

  // Handle logout
  const handleLogout = () => {
    // Call the logout function from auth context
    // It handles the API call and state cleanup
    logout();
    // Redirect to home page
    setLocation("/");
  };

  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar for desktop - Fixed position */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarCollapsed ? "80px" : "256px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex flex-col border-r bg-card relative h-screen"
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isSidebarCollapsed}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        {/* Logo */}
        <div className={cn("p-6 transition-all", isSidebarCollapsed && "px-4")}>
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer group">
              <AnimatePresence mode="wait">
                {isSidebarCollapsed ? (
                  <motion.span
                    key="collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent group-hover:from-primary/80 group-hover:to-primary transition-all"
                  >
                    J
                  </motion.span>
                ) : (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent group-hover:from-primary/80 group-hover:to-primary transition-all">Jadoo</span>
                    <span className="bg-gradient-to-r from-primary to-primary/80 text-white text-xs px-1.5 py-0.5 rounded shadow-sm">v2.0</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        {/* Navigation - Scrollable area */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" aria-label="Main navigation">
          <ul className="space-y-1 px-2" role="list">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link href={link.path}>
                  <Button
                    variant={isActive(link.path) ? "default" : "ghost"}
                    className={cn(
                      "w-full transition-all hover:scale-105 active:scale-95",
                      isSidebarCollapsed ? "justify-center px-2" : "justify-start",
                      isActive(link.path) && "bg-gradient-to-r from-primary to-primary/80 shadow-md"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                    aria-label={link.label}
                    aria-current={isActive(link.path) ? "page" : undefined}
                  >
                    <link.icon className={cn("h-4 w-4", !isSidebarCollapsed && "mr-2")} aria-hidden="true" />
                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {link.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Menu - Fixed at bottom */}
        <div className="p-4 border-t flex-shrink-0">
          {isSidebarCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {user?.fullName || user?.username || "User"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  <span className="truncate">{user?.fullName || user?.username || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </motion.aside>

      {/* Main content area - Takes remaining space */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header for mobile - Fixed at top */}
        <header className="md:hidden border-b px-4 py-3 bg-card flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <span className="font-bold text-xl text-primary">Jadoo</span>
                <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded">v2.0</span>
              </div>
            </Link>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-accent" aria-label="Open navigation menu">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col h-full">
                  <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle className="text-left">
                      <div className="flex items-center">
                        <span className="font-bold text-xl text-primary">Jadoo</span>
                        <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded ml-2">v2.0</span>
                      </div>
                    </SheetTitle>
                    <SheetDescription className="text-left">
                      AI-powered study assistant
                    </SheetDescription>
                  </SheetHeader>
                  
                  {/* Scrollable navigation area */}
                  <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
                    <ul className="space-y-1" role="list">
                      {navLinks.map((link) => (
                        <li key={link.path}>
                          <SheetClose asChild>
                            <Link href={link.path}>
                              <Button
                                variant={isActive(link.path) ? "default" : "ghost"}
                                className={cn(
                                  "w-full justify-start",
                                  isActive(link.path) && "bg-gradient-to-r from-primary to-primary/80 shadow-md"
                                )}
                                aria-label={link.label}
                                aria-current={isActive(link.path) ? "page" : undefined}
                              >
                                <link.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                {link.label}
                              </Button>
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  {/* Fixed user menu at bottom */}
                  <div className="px-3 py-4 border-t flex-shrink-0 space-y-1 bg-card">
                    <div className="flex items-center px-3 py-2 mb-2 bg-accent/50 rounded-md">
                      <User className="mr-2 h-4 w-4 text-primary" />
                      <span className="font-medium truncate text-sm">{user?.fullName || user?.username || "User"}</span>
                    </div>
                    <SheetClose asChild>
                      <Link href="/profile">
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/settings">
                        <Button variant="ghost" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main content - Scrollable area */}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden bg-background" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}