import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary' 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  const colorMap = {
    primary: 'text-primary',
    white: 'text-white',
    gray: 'text-gray-400'
  };
  
  const circles = [0, 1, 2, 3, 4];
  
  return (
    <div className="flex items-center justify-center">
      <div className={`relative ${sizeMap[size]}`}>
        {circles.map((index) => (
          <motion.span
            key={index}
            className={`absolute top-0 left-0 rounded-full border-2 border-t-transparent border-l-transparent ${colorMap[color]}`}
            style={{
              height: '100%',
              width: '100%',
              transformOrigin: 'center',
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 1.5,
              ease: "linear",
              repeat: Infinity,
              delay: index * 0.1,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={`h-1/3 w-1/3 rounded-full bg-gradient-to-br from-primary to-emerald-500`}
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </div>
  );
}