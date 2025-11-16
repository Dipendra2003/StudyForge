import { motion } from 'framer-motion';
import { Check, CheckCircle2, Sparkles, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SuccessCheckmark({ size = 'md', className }: SuccessCheckmarkProps) {
  const sizeMap = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  };
  
  const iconSizeMap = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
      className={cn("relative", sizeMap[size], className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
      />
      <div className={cn(
        "relative flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg",
        sizeMap[size]
      )}>
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CheckCircle2 className={cn("text-white", iconSizeMap[size])} />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface ConfettiEffectProps {
  trigger?: boolean;
  type?: 'basic' | 'celebration' | 'achievement';
}

export function ConfettiEffect({ trigger = true, type = 'basic' }: ConfettiEffectProps) {
  useEffect(() => {
    if (!trigger) return;

    const fireConfetti = () => {
      switch (type) {
        case 'celebration':
          // Multiple bursts
          const duration = 3000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

          const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              clearInterval(interval);
              return;
            }

            const particleCount = 50 * (timeLeft / duration);
            
            confetti({
              ...defaults,
              particleCount,
              origin: { x: Math.random(), y: Math.random() - 0.2 }
            });
          }, 250);
          break;

        case 'achievement':
          // Fireworks effect
          const count = 200;
          const defaults2 = {
            origin: { y: 0.7 },
            zIndex: 1000
          };

          const fire = (particleRatio: number, opts: any) => {
            confetti({
              ...defaults2,
              ...opts,
              particleCount: Math.floor(count * particleRatio)
            });
          };

          fire(0.25, {
            spread: 26,
            startVelocity: 55,
          });
          fire(0.2, {
            spread: 60,
          });
          fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
          });
          fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
          });
          fire(0.1, {
            spread: 120,
            startVelocity: 45,
          });
          break;

        case 'basic':
        default:
          // Simple confetti burst
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          break;
      }
    };

    fireConfetti();
  }, [trigger, type]);

  return null;
}

interface SuccessMessageProps {
  title: string;
  message?: string;
  icon?: 'check' | 'trophy' | 'star' | 'sparkles';
  showConfetti?: boolean;
  confettiType?: 'basic' | 'celebration' | 'achievement';
  className?: string;
}

export function SuccessMessage({ 
  title, 
  message, 
  icon = 'check',
  showConfetti = false,
  confettiType = 'basic',
  className 
}: SuccessMessageProps) {
  const iconMap = {
    check: CheckCircle2,
    trophy: Trophy,
    star: Star,
    sparkles: Sparkles
  };
  
  const Icon = iconMap[icon];

  return (
    <>
      {showConfetti && <ConfettiEffect trigger={true} type={confettiType} />}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "rounded-lg border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-6 shadow-lg",
          className
        )}
      >
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-green-500/20 rounded-full blur-md"
              />
              <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </motion.div>
          
          <div className="flex-1 space-y-1">
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-green-900 dark:text-green-100"
            >
              {title}
            </motion.h3>
            {message && (
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-green-700 dark:text-green-300"
              >
                {message}
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressIndicator({ 
  current, 
  total, 
  label,
  showPercentage = true,
  className 
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  const isComplete = current >= total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-2", className)}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {label || `Progress: ${current} / ${total}`}
        </span>
        {showPercentage && (
          <span className={cn(
            "font-semibold",
            isComplete ? "text-green-600" : "text-muted-foreground"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            isComplete 
              ? "bg-gradient-to-r from-green-500 to-emerald-600"
              : "bg-gradient-to-r from-primary to-primary/80"
          )}
        />
        
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: 2 }}
            className="absolute inset-0 bg-white/30"
          />
        )}
      </div>
      
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sm font-medium text-green-600"
        >
          <Check className="h-4 w-4" />
          <span>Complete!</span>
        </motion.div>
      )}
    </motion.div>
  );
}

interface FlashcardReviewFeedbackProps {
  correct: boolean;
  streak?: number;
}

export function FlashcardReviewFeedback({ correct, streak }: FlashcardReviewFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "rounded-lg p-4 border-2",
        correct 
          ? "bg-green-50 dark:bg-green-950 border-green-500/50"
          : "bg-red-50 dark:bg-red-950 border-red-500/50"
      )}
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {correct ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <div className="h-8 w-8 rounded-full border-2 border-red-600 flex items-center justify-center">
              <span className="text-red-600 text-xl font-bold">✕</span>
            </div>
          )}
        </motion.div>
        
        <div className="flex-1">
          <p className={cn(
            "font-semibold",
            correct ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"
          )}>
            {correct ? "Correct!" : "Keep practicing!"}
          </p>
          {correct && streak && streak > 1 && (
            <p className="text-sm text-green-700 dark:text-green-300">
              🔥 {streak} in a row!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
