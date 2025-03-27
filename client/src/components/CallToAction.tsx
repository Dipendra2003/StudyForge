import { motion } from "framer-motion";
import AnimatedCTA from "./AnimatedCTA";

interface CallToActionProps {
  onScrollToWaitlist: () => void;
}

export default function CallToAction({ onScrollToWaitlist }: CallToActionProps) {
  return (
    <section className="py-24 relative" id="learn-more">
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-emerald-500 opacity-90"></div>
      
      {/* Abstract background pattern instead of stock photo */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Animated background particles */}
      <motion.div 
        className="absolute top-10 right-20 w-24 h-24 rounded-full bg-white opacity-10"
        animate={{
          y: [0, -50, 0],
          x: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="absolute bottom-20 left-20 w-32 h-32 rounded-full bg-white opacity-10"
        animate={{
          y: [0, 60, 0],
          x: [0, -40, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center text-white"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to transform your learning experience?</h2>
          <p className="text-xl mb-10 text-white/90">
            Join hundreds of students already achieving academic success with Jadoo 2.0. Get access to AI-powered study tools and boost your grades.
          </p>
          
          <div className="flex justify-center">
            <AnimatedCTA 
              onClick={onScrollToWaitlist}
              text="Get Started Now"
              size="lg"
              variant="secondary"
              className="bg-white text-primary font-bold text-lg py-7 px-10 rounded-full shadow-xl"
            />
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-6 text-white/80 text-sm"
          >
            No credit card required. Start with our free plan today.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
