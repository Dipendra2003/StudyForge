import { Link } from "wouter";
import { Mail, Github, Linkedin, Heart, ExternalLink } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand Section */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 text-center sm:text-left">
            <Link href="/" className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 inline-block">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Jadoo<span className="text-gray-900 dark:text-white">2.0</span>
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto sm:mx-0 mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed px-4 sm:px-0">
              Our AI-powered study assistant is designed to transform how you learn, understand complex topics, and achieve academic success.
            </p>
            <div className="flex justify-center sm:justify-start space-x-3 sm:space-x-4">
              <a 
                href="https://x.com/Dipendrasah76" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                aria-label="Twitter/X"
              >
                <FaXTwitter className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/dipendra-kumar-b077b9286/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/Dipendra2003/StudyForge" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:dipendrak299@gmail.com"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Product Section */}
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Product</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">Features</span>
                </Link>
              </li>
              <li>
                <Link href="/#benefits" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">Benefits</span>
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">Pricing</span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company Section */}
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Company</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group">
                  <span className="group-hover:translate-x-1 transition-transform">Help</span>
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:dipendrak299@gmail.com?subject=Support Request" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Support</span>
                </a>
              </li>
            </ul>
          </div>
          
          {/* Resources Section */}
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Resources</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">GitHub</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge#-readme" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Documentation</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="https://portfolio-dipendra.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Developer</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex items-center justify-center sm:justify-start group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Report Bug</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-300 dark:border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 dark:text-gray-500 text-xs sm:text-sm text-center md:text-left">
              <span className="inline">&copy; {currentYear} StudyForge (Jadoo 2.0). All rights reserved.</span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center">
                Made with <Heart className="w-3 h-3 sm:w-4 sm:h-4 mx-1 text-red-500" fill="currentColor" /> by{" "}
                <a 
                  href="https://portfolio-dipendra.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline whitespace-nowrap"
                >
                  Dipendra Kumar
                </a>
              </span>
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
              <Link href="/privacy-policy" className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 text-xs sm:text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 text-xs sm:text-sm transition-colors">
                Terms of Service
              </Link>
              <a 
                href="mailto:dipendrak299@gmail.com?subject=Cookie Policy Inquiry" 
                className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 text-xs sm:text-sm transition-colors"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
