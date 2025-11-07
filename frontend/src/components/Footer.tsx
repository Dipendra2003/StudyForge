import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold mb-4 text-white inline-block">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Jadoo<span className="text-white">2.0</span>
              </span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md mt-4">
              Our AI-powered study assistant is designed to transform how you learn, understand complex topics, and achieve academic success.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="/#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="/#benefits" className="text-gray-400 hover:text-white transition-colors">Benefits</a></li>
              <li><a href="/#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li><a href="mailto:careers@jadoo.ai" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="mailto:support@jadoo.ai" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              <li><a href="mailto:contact@jadoo.ai" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Jadoo2.0. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-400 text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-400 text-sm">
              Terms of Service
            </Link>
            <a href="mailto:privacy@jadoo.ai" className="text-gray-500 hover:text-gray-400 text-sm">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
