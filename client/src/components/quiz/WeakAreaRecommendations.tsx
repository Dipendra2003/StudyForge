import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingDown, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';

interface WeakAreaRecommendationsProps {
  userId: number;
  onStartQuiz?: (category: string) => void;
  autoFetch?: boolean;
}

interface WeakAreaData {
  weakCategories: string[];
  recommendations: string[];
  categoryPerformance: Record<string, number>;
  overallAccuracy: number;
}

export function WeakAreaRecommendations({ 
  userId, 
  onStartQuiz,
  autoFetch = true 
}: WeakAreaRecommendationsProps) {
  const [data, setData] = useState<WeakAreaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations();
    }
  }, [userId, autoFetch]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quiz/weak-areas/${userId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weak area recommendations');
      }

      const result = await response.json();
      
      if (result.success) {
        setData({
          weakCategories: result.weakCategories,
          recommendations: result.recommendations,
          categoryPerformance: result.categoryPerformance,
          overallAccuracy: result.overallAccuracy,
        });
      }
    } catch (error) {
      console.error('Error fetching weak area recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (category: string) => {
    if (onStartQuiz) {
      onStartQuiz(category);
    } else {
      // Navigate to quiz mode with the category pre-selected
      navigate(`/quiz-mode?category=${encodeURIComponent(category)}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-orange-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // No weak areas - show positive message
  if (data.weakCategories.length === 0) {
    return (
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/20">
              <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-green-900 dark:text-green-100">
                Excellent Performance!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {data.recommendations[0] || "You're performing well across all categories. Keep up the great work!"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-full bg-orange-500/20">
            <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Areas for Improvement
            </CardTitle>
            <CardDescription>
              Focus on these topics to boost your overall performance
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Weak Categories */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            Categories Below Average ({data.overallAccuracy}%)
          </h4>
          <div className="space-y-3">
            {data.weakCategories.map((category, index) => {
              const performance = data.categoryPerformance[category] || 0;
              const performancePercent = Math.round(performance * 100);
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className="p-4 rounded-lg bg-white/50 dark:bg-gray-900/50 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:text-orange-400">
                        {performancePercent}%
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartQuiz(category)}
                      className="text-xs hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      Practice
                    </Button>
                  </div>
                  <Progress 
                    value={performancePercent} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Current: {performancePercent}%</span>
                    <span>Target: {data.overallAccuracy}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-600" />
            AI Study Recommendations
          </h4>
          <div className="space-y-2">
            {data.recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + (0.1 * index) }}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-900/50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed">{recommendation}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={() => navigate('/quiz-mode')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            <Target className="mr-2 h-4 w-4" />
            Start Targeted Practice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
