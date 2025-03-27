import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  onNavigate: (section: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
            <div className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Jadoo<span className="text-black dark:text-white">2.0</span>
              </span>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-10">
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
          </nav>
          
          <div>
            <Button 
              onClick={() => onNavigate('features')} 
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
            className="md:hidden bg-white border-t"
          >
            <div className="container mx-auto px-6 py-4">
              <nav className="flex flex-col space-y-4">
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
                <Button 
                  onClick={() => {
                    onNavigate('features');
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
