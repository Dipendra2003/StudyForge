import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import AnimatedCTA from './AnimatedCTA';

interface CallToActionProps {
  onScrollToWaitlist: () => void;
}

export default function CallToAction({ onScrollToWaitlist }: CallToActionProps) {
  return (
    <section className="py-10 relative overflow-hidden bg-gray-50/50 dark:bg-gray-950">
      {/* Intense Glowing Backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-60"></div>
        <div className="w-[600px] h-[400px] bg-emerald-500/15 rounded-full blur-[100px] opacity-40 absolute translate-x-1/3"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative rounded-[2.5rem] overflow-hidden bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border border-white dark:border-gray-800/50 shadow-2xl shadow-primary/5 p-10 md:p-20 text-center"
        >
          {/* Inner ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-gradient-to-b from-primary/10 to-transparent blur-2xl pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm mb-8"
          >
            <Zap size={16} className="text-amber-500 fill-amber-500" />
            <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent uppercase tracking-wider">
              Boost your learning efficiency
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-gray-900 dark:text-white"
          >
            Ready to Transform Your <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 pb-2">
              Study Experience?
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Join thousands of students using Jadoo 2.0 to learn faster, retain more, and achieve better results in their studies without the burnout.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-14"
          >
            <div className="shadow-xl shadow-primary/20 rounded-full">
              <AnimatedCTA
                text="Get Started Free"
                onClick={onScrollToWaitlist}
                size="lg"
                className="px-10 py-6 text-lg font-bold"
              />
            </div>
            
            <button
              onClick={() => window.location.href = '/about'}
              className="group flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors px-6 py-4 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              Learn more about features
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            {[
              "No credit card required",
              "Free plan available",
              "Cancel anytime"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}