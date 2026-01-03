import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AdaptiveDifficultyNotificationProps {
  userId: number;
  onDismiss?: () => void;
  autoFetch?: boolean;
}

interface DifficultyRecommendation {
  difficulty: 'easy' | 'medium' | 'hard';
  changed: boolean;
  notification?: string;
  oldDifficulty?: string;
  averageScore?: number;
}

const DISMISSED_KEY = 'adaptive-difficulty-dismissed';

export function AdaptiveDifficultyNotification({ 
  userId, 
  onDismiss,
  autoFetch = true 
}: AdaptiveDifficultyNotificationProps) {
  const [recommendation, setRecommendation] = useState<DifficultyRecommendation | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (autoFetch) {
      fetchRecommendation();
    }
  }, [userId, autoFetch]);

  const fetchRecommendation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quiz/adaptive-difficulty/${userId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch difficulty recommendation');
      }

      const data = await response.json();
      
      if (data.success && data.changed) {
        // Check if this notification was already dismissed
        const dismissedData = localStorage.getItem(DISMISSED_KEY);
        const dismissed = dismissedData ? JSON.parse(dismissedData) : {};
        const dismissKey = `${userId}-${data.oldDifficulty}-${data.difficulty}`;
        
        if (!dismissed[dismissKey]) {
          setRecommendation(data);
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error fetching adaptive difficulty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    if (recommendation) {
      // Persist dismissed state
      const dismissedData = localStorage.getItem(DISMISSED_KEY);
      const dismissed = dismissedData ? JSON.parse(dismissedData) : {};
      const dismissKey = `${userId}-${recommendation.oldDifficulty}-${recommendation.difficulty}`;
      dismissed[dismissKey] = Date.now();
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
    
    setIsVisible(false);
    onDismiss?.();
  };

  if (isLoading || !recommendation || !isVisible) {
    return null;
  }

  const isIncrease = recommendation.oldDifficulty && 
    ['easy', 'medium', 'hard'].indexOf(recommendation.difficulty) > 
    ['easy', 'medium', 'hard'].indexOf(recommendation.oldDifficulty);

  const difficultyColors = {
    easy: 'from-green-500/20 to-green-600/20 border-green-500/30',
    medium: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    hard: 'from-red-500/20 to-red-600/20 border-red-500/30',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <Card 
            className={`
              relative overflow-hidden border-2
              bg-gradient-to-br ${difficultyColors[recommendation.difficulty]}
              backdrop-blur-lg shadow-2xl
            `}
          >
            {/* Animated background sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
                className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
              />
            </div>

            <div className="relative p-6">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Icon and title */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`
                  p-3 rounded-full 
                  ${isIncrease ? 'bg-green-500/20' : 'bg-blue-500/20'}
                `}>
                  {isIncrease ? (
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-bold text-lg">
                      Difficulty Adjusted!
                    </h3>
                  </div>
                  
                  {/* Difficulty change indicator */}
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <span className="capitalize px-2 py-1 rounded bg-white/20">
                      {recommendation.oldDifficulty}
                    </span>
                    <span>→</span>
                    <span className="capitalize px-2 py-1 rounded bg-white/30 font-bold">
                      {recommendation.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI-generated message */}
              {recommendation.notification && (
                <p className="text-sm leading-relaxed mb-4 pl-16">
                  {recommendation.notification}
                </p>
              )}

              {/* Performance indicator */}
              {recommendation.averageScore !== undefined && (
                <div className="pl-16 text-xs opacity-75">
                  Based on your recent performance: {recommendation.averageScore}% average
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
