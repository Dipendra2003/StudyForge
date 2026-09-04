import { motion } from "framer-motion";

const benefits = [
  {
    icon: "graduation-cap",
    title: "Accelerated Learning",
    description: "Master complex subjects faster with AI-generated explanations and summaries tailored to your learning style."
  },
  {
    icon: "tachometer-alt",
    title: "Improved Productivity",
    description: "Focus on understanding concepts rather than searching for information. Study smarter, not harder."
  },
  {
    icon: "chart-line",
    title: "Better Academic Performance",
    description: "Practice with custom-generated exercises and receive personalized feedback to improve your grades."
  },
  {
    icon: "book-reader",
    title: "Personalized Education",
    description: "Enjoy learning adapted to your pace, preferences, and knowledge gaps for a truly personalized experience."
  }
];

export default function Benefits() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Transform Your Learning</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Jadoo 2.0 revolutionizes the way you study, helping you achieve academic excellence with less stress and more efficiency.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Abstract workspace visualization instead of stock photo */}
            {/* Premium Interactive Bento Grid */}
            <div className="relative rounded-2xl shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 aspect-square md:aspect-auto md:h-[450px] overflow-hidden group">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-emerald-500/10 to-amber-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none"></div>
              
              <div className="h-full grid grid-cols-2 grid-rows-2 gap-4 relative z-10">
                {/* Widget 1 - Accelerated Learning (Progress Track) */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l1.9-2"/>
                        <path d="M12 15l-3-3a22 22 0 0 1 3.82-5.4l2.45-2.45a3.12 3.12 0 0 1 4.41 0 3.15 3.15 0 0 1 0 4.41l-2.45 2.45A22 22 0 0 1 12 15Z"/>
                      </svg>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">+200% Spd</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      <span>Course Mastery</span>
                      <span className="text-primary">82%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: '82%' }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                      ></motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Widget 2 - Productivity (Time Saved) */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20 shadow-sm flex flex-col justify-center"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Time Saved</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/60 dark:bg-gray-800/60 rounded border border-emerald-100 dark:border-emerald-800/50 p-2 text-center">
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">2h</div>
                      <div className="text-[8px] font-semibold text-gray-500 dark:text-gray-400 uppercase mt-0.5">Reading</div>
                    </div>
                    <div className="flex-1 bg-white/60 dark:bg-gray-800/60 rounded border border-emerald-100 dark:border-emerald-800/50 p-2 text-center">
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">1.5h</div>
                      <div className="text-[8px] font-semibold text-gray-500 dark:text-gray-400 uppercase mt-0.5">Notes</div>
                    </div>
                  </div>
                </motion.div>

                {/* Widget 3 - Performance (Mini Chart) */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-500">Grade Trend</span>
                    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </div>
                  <div className="flex items-end gap-1.5 h-16 mt-2 relative">
                    <div className="w-full bg-amber-100 dark:bg-amber-900/40 rounded-t-sm h-[30%] hover:bg-amber-200 transition-colors cursor-pointer"></div>
                    <div className="w-full bg-amber-200 dark:bg-amber-800/50 rounded-t-sm h-[50%] hover:bg-amber-300 transition-colors cursor-pointer"></div>
                    <div className="w-full bg-amber-300 dark:bg-amber-700/60 rounded-t-sm h-[75%] hover:bg-amber-400 transition-colors cursor-pointer"></div>
                    <motion.div 
                      initial={{ height: 0 }}
                      whileInView={{ height: '100%' }}
                      transition={{ duration: 0.8, type: 'spring' }}
                      className="w-full bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-sm relative cursor-pointer"
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-white text-white dark:text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">A+</div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Widget 4 - Personalized (Preferences Sliders) */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center"
                >
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3">AI Preferences</div>
                  <div className="space-y-2.5">
                    {/* Slider 1 */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 w-12 uppercase tracking-wide">Visual</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-indigo-500 rounded-full"></div>
                      </div>
                    </div>
                    {/* Slider 2 */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 w-12 uppercase tracking-wide">Detail</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="w-[60%] h-full bg-indigo-400 rounded-full"></div>
                      </div>
                    </div>
                    {/* Slider 3 */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 w-12 uppercase tracking-wide">Pacing</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="w-[100%] h-full bg-indigo-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
          
          <div>
            <div className="space-y-10">
              {benefits.map((benefit, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <i className={`fas fa-${benefit.icon} text-primary`}></i>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
