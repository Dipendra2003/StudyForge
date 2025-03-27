import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface AnimatedCTAProps {
  onClick?: () => void;
  text: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export default function AnimatedCTA({ 
  onClick, 
  text, 
  className = '',
  size = 'default',
  variant = 'default'
}: AnimatedCTAProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      {/* Animated background element */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-primary/20 blur-md"
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ 
          opacity: 1, 
          scale: 1.1,
          transition: { duration: 0.3 }
        }}
      />
      
      {/* Main button */}
      <Button
        onClick={onClick}
        size={size}
        variant={variant}
        className={`relative z-10 overflow-hidden ${className}`}
      >
        <span className="relative z-10">{text}</span>
        
        {/* Arrow icon with motion */}
        <motion.span
          className="inline-block ml-2 relative z-10"
          initial={{ x: 0 }}
          whileHover={{ x: 5, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.6 } }}
        >
          <ArrowRight className="h-4 w-4" />
        </motion.span>
        
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/80 to-emerald-500/80 z-0"
          initial={{ x: '100%' }}
          whileHover={{ 
            x: 0,
            transition: { duration: 0.4, ease: "easeOut" }
          }}
        />
      </Button>
    </motion.div>
  );
}