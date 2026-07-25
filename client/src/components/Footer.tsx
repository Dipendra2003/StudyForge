import { Link } from "wouter";
import { Mail, Github, Linkedin, Heart, ExternalLink } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-8">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-2 text-left">
            <Link href="/" className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 inline-block">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Jadoo<span className="text-gray-900 dark:text-white">2.0</span>
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-sm mt-2 text-sm leading-relaxed">
              Our AI-powered study assistant is designed to transform how you learn, understand complex topics, and achieve academic success.
            </p>
            <div className="flex justify-start space-x-3">
              <a 
                href="https://x.com/Dipendrasah76" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full"
                aria-label="Twitter/X"
              >
                <FaXTwitter className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/dipendra-kumar-b077b9286/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/Dipendra2003/StudyForge" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:dipendrak299@gmail.com"
                className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Product Section */}
          <div className="col-span-1 text-left mt-2 lg:mt-0">
            <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Features</span>
                </Link>
              </li>
              <li>
                <Link href="/#benefits" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Benefits</span>
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Pricing</span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company Section */}
          <div className="col-span-1 text-left mt-2 lg:mt-0">
            <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Help</span>
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:dipendrak299@gmail.com?subject=Support Request" 
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Support</span>
                </a>
              </li>
            </ul>
          </div>
          
          {/* Resources Section */}
          <div className="col-span-1 text-left mt-2 lg:mt-0">
            <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group"
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
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group"
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
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group"
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
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Report Bug</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-500 dark:text-gray-500 text-sm text-center md:text-left leading-relaxed">
              &copy; {currentYear} StudyForge (Jadoo 2.0). All rights reserved. 
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> • </span>
              <span className="inline-block mt-1 sm:mt-0">
                Made with <Heart className="w-4 h-4 inline-block mx-1 text-red-500 relative -top-[2px]" fill="currentColor" /> by{" "}
                <a 
                  href="https://portfolio-dipendra.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Dipendra Kumar
                </a>
              </span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 w-full md:w-auto">
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
