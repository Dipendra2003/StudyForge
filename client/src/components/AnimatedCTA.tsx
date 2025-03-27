import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  className,
  size = 'default',
  variant = 'default'
}: AnimatedCTAProps) {
  return (
    <div className="relative group w-full sm:w-auto">
      <motion.div
        className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary via-violet-500 to-indigo-500 opacity-70 blur group-hover:opacity-100 transition duration-300"
        initial={{ scale: 0.95 }}
        animate={{ 
          scale: [0.95, 1.05, 0.95],
          rotate: [0, 1, 0, -1, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <Button
        onClick={onClick}
        size={size}
        variant={variant}
        className={cn(
          "relative z-10 font-semibold tracking-wide transition-all duration-300 w-full sm:w-auto",
          "hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95",
          className
        )}
      >
        {text}
      </Button>
    </div>
  );
}