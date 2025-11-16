import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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
import { User, LogOut, Settings, LayoutDashboard } from "lucide-react";

interface HeaderProps {
  onNavigate: (section: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const isHomePage = location === "/";
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Jadoo<span className="text-black dark:text-white">2.0</span>
              </span>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            {isHomePage ? (
              <>
                <button 
                  onClick={() => onNavigate('features')} 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  Features
                </button>
                <button 
                  onClick={() => onNavigate('benefits')} 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  Benefits
                </button>
                <button 
                  onClick={() => onNavigate('faq')} 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  FAQ
                </button>
              </>
            ) : null}
            <Link href="/about" className="text-gray-600 hover:text-primary transition-colors font-medium">
              About
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Pricing
            </Link>
          </nav>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button 
                    className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hidden md:inline-flex rounded-full"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {user?.fullName || user?.username || "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/dashboard">
                      <DropdownMenuItem>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
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
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button 
                  className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                >
                  Get Started
                </Button>
              </Link>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-500 hover:text-gray-700"
              aria-label="Toggle menu"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white/90 backdrop-blur-md border-t"
          >
            <div className="container mx-auto px-6 py-4">
              <nav className="flex flex-col space-y-4">
                {isHomePage ? (
                  <>
                    <button 
                      onClick={() => {
                        onNavigate('features');
                        setMobileMenuOpen(false);
                      }} 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      Features
                    </button>
                    <button 
                      onClick={() => {
                        onNavigate('benefits');
                        setMobileMenuOpen(false);
                      }} 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      Benefits
                    </button>
                    <button 
                      onClick={() => {
                        onNavigate('faq');
                        setMobileMenuOpen(false);
                      }} 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      FAQ
                    </button>
                  </>
                ) : null}
                <Link 
                  href="/about" 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link 
                  href="/privacy-policy" 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Privacy Policy
                </Link>
                <Link 
                  href="/terms" 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Terms
                </Link>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Theme</span>
                  <ThemeToggle />
                </div>
                
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center px-3 py-2 mb-2 border-t pt-4">
                      <User className="mr-2 h-4 w-4" />
                      <span className="font-medium">{user?.fullName || user?.username || "User"}</span>
                    </div>
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white font-medium w-full rounded-full shadow-md hover:shadow-lg transition-all"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                    </Link>
                    <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white font-medium w-full rounded-full shadow-md hover:shadow-lg transition-all"
                    >
                      Get Started
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
