import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/App";
import { useTheme } from "@/components/theme-provider";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle viewport changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      logout();
      navigate("/login");
      toast({
        title: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Please try again",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: <Icons.home className="h-5 w-5" />,
      path: "/dashboard",
      isActive: location === "/dashboard",
    },
    {
      title: "AI Chat",
      icon: <Icons.messageCircle className="h-5 w-5" />,
      path: "/chat",
      isActive: location.startsWith("/chat"),
    },
    {
      title: "Documents",
      icon: <Icons.fileText className="h-5 w-5" />,
      path: "/documents",
      isActive: location.startsWith("/documents"),
    },
    {
      title: "Flashcards",
      icon: <Icons.bookOpen className="h-5 w-5" />,
      path: "/flashcards",
      isActive: location.startsWith("/flashcards"),
    },
    {
      title: "Quiz Mode",
      icon: <Icons.fileQuestion className="h-5 w-5" />,
      path: "/quiz",
      isActive: location.startsWith("/quiz"),
    },
    {
      title: "Code Generator",
      icon: <Icons.code className="h-5 w-5" />,
      path: "/code-generator",
      isActive: location.startsWith("/code-generator"),
    },
    {
      title: "Study Planner",
      icon: <Icons.calendar className="h-5 w-5" />,
      path: "/study-planner",
      isActive: location.startsWith("/study-planner"),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Icons.book className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Jadoo</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant={item.isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-sm py-6",
                item.isActive && "font-semibold"
              )}
              onClick={() => navigate(item.path)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.title}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4 md:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span>≡</span>
          </Button>

          {/* Logo for mobile */}
          <div className="md:hidden flex items-center gap-2">
            <Icons.book className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Jadoo</h1>
          </div>

          {/* Right side of header */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Icons.sun className="h-5 w-5" />
              ) : (
                <Icons.moon className="h-5 w-5" />
              )}
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profilePicture} alt={user?.username} />
                    <AvatarFallback>
                      {user?.username ? getInitials(user.username) : "JD"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user?.fullName && (
                      <p className="font-medium">{user.fullName}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email || user?.username}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Icons.settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <Icons.logout className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-950 w-64 h-full overflow-y-auto">
              <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Icons.book className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold">Jadoo</h1>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>×</span>
                </Button>
              </div>
              <nav className="p-4 space-y-1">
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    variant={item.isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-sm py-6",
                      item.isActive && "font-semibold"
                    )}
                    onClick={() => navigate(item.path)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.title}
                  </Button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}