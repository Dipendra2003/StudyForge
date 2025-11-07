import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/App";
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
  HelpCircle,
  User,
  LogOut,
  Menu,
  ChevronRight,
  ClipboardList,
  Settings,
} from "lucide-react";

// Define the DashboardLayout props type
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  // Navigation links config
  const navLinks = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Chat Assistant", path: "/chat" },
    { icon: FileText, label: "Document Summarization", path: "/document-summarization" },
    { icon: BookOpen, label: "Flashcards", path: "/flashcards" },
    { icon: ClipboardList, label: "Quiz Mode", path: "/quiz-mode" },
    { icon: Code, label: "Code Generator", path: "/code-generator" },
    { icon: Calendar, label: "Study Planner", path: "/study-planner" },
  ];

  // Update isMobile state based on window width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        logout();
        setLocation("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <span className="font-bold text-2xl text-primary">Jadoo</span>
              <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded">v2.0</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link href={link.path}>
                  <Button
                    variant={isActive(link.path) ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive(link.path) ? "bg-primary" : ""
                    }`}
                  >
                    <link.icon className="mr-2 h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                {user?.fullName || user?.username || "User"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header for mobile */}
        <header className="md:hidden border-b px-4 py-3 bg-card">
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
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 px-0">
                  <SheetHeader className="px-6 py-4">
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
                  <nav className="px-2 mt-4">
                    <ul className="space-y-1">
                      {navLinks.map((link) => (
                        <li key={link.path}>
                          <Link href={link.path}>
                            <Button
                              variant={isActive(link.path) ? "default" : "ghost"}
                              className={`w-full justify-start ${
                                isActive(link.path) ? "bg-primary" : ""
                              }`}
                            >
                              <link.icon className="mr-2 h-4 w-4" />
                              {link.label}
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="px-2 py-4 mt-auto border-t">
                    <div className="flex items-center px-3 py-2">
                      <User className="mr-2 h-4 w-4" />
                      <span>{user?.fullName || user?.username || "User"}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}