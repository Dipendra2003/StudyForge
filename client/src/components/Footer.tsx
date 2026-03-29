import { Link } from "wouter";
import { Mail, Github, Linkedin, Heart, ExternalLink } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Link href="/" className="text-2xl font-bold mb-4 text-white inline-block">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Jadoo<span className="text-white">2.0</span>
              </span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md mt-4 text-sm leading-relaxed">
              Our AI-powered study assistant is designed to transform how you learn, understand complex topics, and achieve academic success.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.linkedin.com/in/dipendra-kumar-b077b9286/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-800 rounded-full"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/Dipendra2003/StudyForge" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-800 rounded-full"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:dipendrak299@gmail.com"
                className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-800 rounded-full"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Product Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Features</span>
                </Link>
              </li>
              <li>
                <Link href="/#benefits" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Benefits</span>
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">Pricing</span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:dipendrak299@gmail.com?subject=Support Request" 
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Support</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:dipendrak299@gmail.com?subject=Contact Inquiry" 
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                </a>
              </li>
            </ul>
          </div>
          
          {/* Resources Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
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
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
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
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
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
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Report Bug</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-sm flex items-center">
              &copy; {currentYear} StudyForge (Jadoo 2.0). All rights reserved.
              <span className="mx-2">•</span>
              Made with <Heart className="w-4 h-4 mx-1 text-red-500 inline" fill="currentColor" /> by{" "}
              <a 
                href="https://portfolio-dipendra.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                Dipendra Kumar
              </a>
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Terms of Service
              </Link>
              <a 
                href="mailto:dipendrak299@gmail.com?subject=Cookie Policy Inquiry" 
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
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
