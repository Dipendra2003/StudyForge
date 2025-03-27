import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/App";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Book, 
  BookOpen, 
  Code, 
  Layout, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Moon, 
  Sun, 
  X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        logout();
        navigate('/login');
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Logout failed",
          description: "Failed to log out. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Failed to connect to the server. Please check your internet connection.",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const navItems = [
    { 
      path: "/dashboard", 
      label: "Dashboard", 
      icon: <Layout className="h-5 w-5" /> 
    },
    { 
      path: "/chat", 
      label: "AI Chat", 
      icon: <MessageSquare className="h-5 w-5" /> 
    },
    { 
      path: "/documents", 
      label: "Documents", 
      icon: <BookOpen className="h-5 w-5" /> 
    },
    { 
      path: "/flashcards", 
      label: "Flashcards", 
      icon: <Book className="h-5 w-5" /> 
    },
    { 
      path: "/code-generator", 
      label: "Code Generator", 
      icon: <Code className="h-5 w-5" /> 
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary">Jadoo</h1>
          <p className="text-sm text-muted-foreground">AI Study Assistant</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePicture} alt={user?.username} />
                <AvatarFallback>{getInitials(user?.fullName || user?.username || "")}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>
      
      {/* Mobile header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="ml-3 text-xl font-bold text-primary">Jadoo</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profilePicture} alt={user?.username} />
              <AvatarFallback>{getInitials(user?.fullName || user?.username || "")}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        
        {/* Mobile menu (overlay) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 left-0 w-64 h-full bg-background p-4 shadow-lg overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-primary">Jadoo</h2>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profilePicture} alt={user?.username} />
                    <AvatarFallback>{getInitials(user?.fullName || user?.username || "")}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="font-medium">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === item.path
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </nav>
              
              <div className="mt-6 pt-6 border-t">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}