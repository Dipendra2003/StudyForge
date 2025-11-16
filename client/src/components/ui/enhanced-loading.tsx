import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface EnhancedLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  showEstimate?: boolean;
  estimatedSeconds?: number;
}

export function EnhancedLoadingSpinner({ 
  size = 'md', 
  text = 'Loading...',
  showEstimate = false,
  estimatedSeconds = 5
}: EnhancedLoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };
  
  const textSizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={cn(sizeMap[size])}
        >
          <Loader2 className={cn("text-primary", sizeMap[size])} />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-md"
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className={cn("font-medium text-foreground", textSizeMap[size])}>
          {text}
        </p>
        {showEstimate && (
          <p className="text-xs text-muted-foreground">
            Estimated time: ~{estimatedSeconds}s
          </p>
        )}
      </div>
    </div>
  );
}

interface AIGenerationLoaderProps {
  text?: string;
  progress?: number;
  showProgress?: boolean;
}

export function AIGenerationLoader({ 
  text = 'AI is generating your content...',
  progress,
  showProgress = true
}: AIGenerationLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity }
          }}
          className="h-16 w-16"
        >
          <Sparkles className="h-16 w-16 text-primary" />
        </motion.div>
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
        />
      </div>
      
      <div className="text-center space-y-3 w-full max-w-md">
        <p className="text-lg font-medium text-foreground">
          {text}
        </p>
        
        {showProgress && progress !== undefined && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
        
        <div className="flex justify-center gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 bg-primary rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
}

export function ListSkeleton({ count = 3, showAvatar = false }: ListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-4 p-4 rounded-lg border bg-card"
        >
          {showAvatar && (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          )}
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-full" />
            <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-6 rounded-lg border bg-card space-y-4"
        >
          <div className="h-6 bg-muted rounded animate-pulse w-2/3" />
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded animate-pulse w-full" />
            <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-8 bg-muted rounded animate-pulse w-20" />
            <div className="h-8 bg-muted rounded animate-pulse w-20" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-muted rounded animate-pulse" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: rowIndex * 0.05 }}
          className="flex gap-4 p-4"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="flex-1 h-3 bg-muted rounded animate-pulse" 
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
