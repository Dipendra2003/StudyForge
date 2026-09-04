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
              Now Live
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              Your AI Study <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Assistant</span> For Success
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg">
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
                className="bg-white dark:bg-gray-800 text-primary border border-primary font-bold py-6 px-8 rounded-full hover:bg-primary/5 transition-all text-center"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg"
              >
                Learn More
              </Button>
            </div>
            
            <div className="mt-8 flex items-center text-gray-500 dark:text-gray-400">
              <div className="flex -space-x-2">
                {/* We use SVG avatars instead of images */}
                <svg className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-primary/20" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="currentColor" fillOpacity="0.2" />
                  <path d="M20 11C17.7909 11 16 12.7909 16 15V17C16 19.2091 17.7909 21 20 21C22.2091 21 24 19.2091 24 17V15C24 12.7909 22.2091 11 20 11Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 25.5C12 24.1193 13.1193 23 14.5 23H25.5C26.8807 23 28 24.1193 28 25.5V27C28 28.1046 27.1046 29 26 29H14C12.8954 29 12 28.1046 12 27V25.5Z" fill="currentColor" />
                </svg>
                <svg className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-emerald-500/20" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="20" fill="currentColor" fillOpacity="0.2" />
                  <path d="M20 11C17.7909 11 16 12.7909 16 15V17C16 19.2091 17.7909 21 20 21C22.2091 21 24 19.2091 24 17V15C24 12.7909 22.2091 11 20 11Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 25.5C12 24.1193 13.1193 23 14.5 23H25.5C26.8807 23 28 24.1193 28 25.5V27C28 28.1046 27.1046 29 26 29H14C12.8954 29 12 28.1046 12 27V25.5Z" fill="currentColor" />
                </svg>
                <svg className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-amber-500/20" viewBox="0 0 40 40">
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
            <div className="relative z-10 perspective-1000">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="transform-gpu"
              >
                {/* Premium Glassmorphism Product Mockup */}
                <div className="rounded-2xl shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 p-6 h-[380px] w-full relative overflow-hidden group hover:shadow-primary/20 transition-all duration-500">
                  {/* Window Controls */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full shadow-sm"></div>
                      <div className="w-3 h-3 bg-amber-400 rounded-full shadow-sm"></div>
                      <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-sm"></div>
                    </div>
                    <div className="w-1/3 h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full"></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 relative z-10">
                    {/* Main AI Feature Box */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="col-span-2 h-36 bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 rounded-xl flex flex-col items-center justify-center border border-primary/10 relative overflow-hidden cursor-pointer shadow-sm"
                    >
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl blur-xl"></div>
                      <svg className="w-12 h-12 text-primary drop-shadow-md z-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
                        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                        <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
                        <path d="M6.002 5.125A3 3 0 0 0 6.401 6.5"/>
                        <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                        <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
                        <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                        <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
                      </svg>
                      <div className="text-sm font-bold text-primary z-10 tracking-wide">Neural Core Active</div>
                      <div className="flex items-center gap-1 mt-1 z-10">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] text-primary/60 font-medium uppercase">Processing</span>
                      </div>
                    </motion.div>

                    {/* Analytics Box */}
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="h-36 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 rounded-xl flex flex-col items-center justify-center border border-emerald-200/50 dark:border-emerald-700/30 cursor-pointer shadow-inner relative overflow-hidden"
                    >
                      <svg className="w-10 h-10 text-emerald-500 drop-shadow-sm mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="m19 9-5 5-4-4-3 3"/>
                      </svg>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">+85%</div>
                      <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase">Retention</div>
                    </motion.div>
                  </div>

                  <div className="flex space-x-4 relative z-10">
                    {/* Content Placeholder with Data */}
                    <div className="w-2/3 bg-gray-50/80 dark:bg-gray-800/80 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-center">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Study Plan Generated</div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-emerald-500 w-[78%] rounded-full relative">
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                          <span>Syllabus Covered</span>
                          <span className="text-primary font-bold">78%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Box */}
                    <motion.div 
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      className="w-1/3 h-20 bg-gradient-to-tl from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/10 rounded-xl flex flex-col items-center justify-center border border-amber-200/50 dark:border-amber-700/30 cursor-pointer shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <svg className="w-7 h-7 text-amber-500 drop-shadow-sm mb-1 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        <path d="M5 3v4"/>
                        <path d="M19 17v4"/>
                        <path d="M3 5h4"/>
                        <path d="M17 19h4"/>
                      </svg>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 tracking-wide uppercase">Generate</div>
                    </motion.div>
                  </div>
                  
                  {/* Decorative background gradients inside the card */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                </div>
              </motion.div>

              {/* Floating Badge overlay */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="absolute -bottom-6 -right-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 flex items-center gap-3"
              >
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </div>
                <p className="font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">AI-Powered Learning</p>
              </motion.div>
            </div>
            <div className="absolute top-1/4 -left-10 w-20 h-20 bg-amber-500/20 rounded-full blur-md"></div>
            <div className="absolute bottom-1/4 right-0 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
