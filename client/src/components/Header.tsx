import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  onNavigate: (section: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const isHomePage = location === "/";

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
            <Button 
              onClick={() => {
                if (isHomePage) {
                  onNavigate('features');
                } else {
                  window.location.href = '/register';
                }
              }} 
              className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              Get Started
            </Button>
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
                
                <Button 
                  onClick={() => {
                    window.location.href = '/register';
                    setMobileMenuOpen(false);
                  }} 
                  className="bg-primary hover:bg-primary/90 text-white font-medium w-full rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  Get Started
                </Button>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
