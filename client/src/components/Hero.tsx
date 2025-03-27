import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface HeroProps {
  onScrollToFeatures?: () => void;
}

export default function Hero({ onScrollToFeatures }: HeroProps) {
  return (
    <section className="pt-32 pb-24 relative overflow-hidden" id="hero">
      {/* Background elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full opacity-70 blur-3xl"></div>
      <div className="absolute top-1/2 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:w-1/2 mb-10 md:mb-0"
          >
            <span className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-semibold mb-6">
              Coming Soon
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              Your AI Study <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Assistant</span> For Success
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Jadoo 2.0 combines advanced AI capabilities to help you learn faster, understand deeper, and study smarter with personalized assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button 
                  className="bg-gradient-to-r from-primary to-emerald-500 text-white font-bold py-6 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-center"
                  size="lg"
                >
                  Get Started
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="bg-white text-primary border border-primary font-bold py-6 px-8 rounded-full hover:bg-primary/5 transition-all text-center"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg"
              >
                Learn More
              </Button>
            </div>
            
            <div className="mt-8 flex items-center text-gray-500">
              <div className="flex -space-x-2">
                {/* We use SVG avatars instead of images */}
                <svg className="h-8 w-8 rounded-full border-2 border-white bg-primary/20" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="currentColor" fillOpacity="0.2" />
                  <path d="M20 11C17.7909 11 16 12.7909 16 15V17C16 19.2091 17.7909 21 20 21C22.2091 21 24 19.2091 24 17V15C24 12.7909 22.2091 11 20 11Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 25.5C12 24.1193 13.1193 23 14.5 23H25.5C26.8807 23 28 24.1193 28 25.5V27C28 28.1046 27.1046 29 26 29H14C12.8954 29 12 28.1046 12 27V25.5Z" fill="currentColor" />
                </svg>
                <svg className="h-8 w-8 rounded-full border-2 border-white bg-emerald-500/20" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="currentColor" fillOpacity="0.2" />
                  <path d="M20 11C17.7909 11 16 12.7909 16 15V17C16 19.2091 17.7909 21 20 21C22.2091 21 24 19.2091 24 17V15C24 12.7909 22.2091 11 20 11Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 25.5C12 24.1193 13.1193 23 14.5 23H25.5C26.8807 23 28 24.1193 28 25.5V27C28 28.1046 27.1046 29 26 29H14C12.8954 29 12 28.1046 12 27V25.5Z" fill="currentColor" />
                </svg>
                <svg className="h-8 w-8 rounded-full border-2 border-white bg-amber-500/20" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="currentColor" fillOpacity="0.2" />
                  <path d="M20 11C17.7909 11 16 12.7909 16 15V17C16 19.2091 17.7909 21 20 21C22.2091 21 24 19.2091 24 17V15C24 12.7909 22.2091 11 20 11Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 25.5C12 24.1193 13.1193 23 14.5 23H25.5C26.8807 23 28 24.1193 28 25.5V27C28 28.1046 27.1046 29 26 29H14C12.8954 29 12 28.1046 12 27V25.5Z" fill="currentColor" />
                </svg>
              </div>
              <p className="ml-4 text-sm">
                <span className="font-semibold">500+</span> students improving their grades with Jadoo 2.0
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:w-1/2 relative"
          >
            <div className="relative z-10">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                {/* Abstract product mockup using SVG */}
                <div className="rounded-2xl shadow-2xl bg-white p-6 h-[350px] w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="w-1/3 h-4 bg-gray-200 rounded-md"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="col-span-2 h-32 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="h-32 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 4H8V20H16V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-2/3 h-20 bg-gray-100 rounded-lg"></div>
                    <div className="w-1/3 h-20 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
              <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-emerald-500"></div>
                  <p className="font-semibold text-gray-800">AI-Powered Learning</p>
                </div>
              </div>
            </div>
            <div className="absolute top-1/4 -left-10 w-20 h-20 bg-amber-500/20 rounded-full blur-md"></div>
            <div className="absolute bottom-1/4 right-0 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
