import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Sparkles, 
  BookOpen,
  BarChart3,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';

interface AIInsightsPanelProps {
  userId: number;
  onStartQuiz?: (category?: string, difficulty?: string) => void;
}

interface DifficultyRecommendation {
  difficulty: 'easy' | 'medium' | 'hard';
  changed: boolean;
  notification?: string;
  oldDifficulty?: string;
  averageScore?: number;
}

interface WeakAreaData {
  weakCategories: string[];
  recommendations: string[];
  categoryPerformance: Record<string, number>;
  overallAccuracy: number;
}

export function AIInsightsPanel({ userId, onStartQuiz }: AIInsightsPanelProps) {
  const [difficultyData, setDifficultyData] = useState<DifficultyRecommendation | null>(null);
  const [weakAreaData, setWeakAreaData] = useState<WeakAreaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetchAllInsights();
  }, [userId]);

  const fetchAllInsights = async () => {
    setIsLoading(true);
    try {
      // Fetch both difficulty and weak area data in parallel
      const [difficultyResponse, weakAreasResponse] = await Promise.all([
        fetch(`/api/quiz/adaptive-difficulty/${userId}`, { credentials: 'include' }),
        fetch(`/api/quiz/weak-areas/${userId}`, { credentials: 'include' })
      ]);

      if (difficultyResponse.ok) {
        const diffData = await difficultyResponse.json();
        if (diffData.success) {
          setDifficultyData(diffData);
        }
      }

      if (weakAreasResponse.ok) {
        const weakData = await weakAreasResponse.json();
        if (weakData.success) {
          setWeakAreaData(weakData);
        }
      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (category?: string, difficulty?: string) => {
    if (onStartQuiz) {
      onStartQuiz(category, difficulty);
    } else {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (difficulty) params.append('difficulty', difficulty);
      navigate(`/quiz-mode${params.toString() ? '?' + params.toString() : ''}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Analyzing your performance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasInsights = difficultyData || weakAreaData;
  const hasWeakAreas = weakAreaData && weakAreaData.weakCategories.length > 0;
  const hasDifficultyChange = difficultyData && difficultyData.changed;

  return (
    <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your quiz performance
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasInsights ? (
          <div className="text-center py-8">
            <Brain className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-2">No Insights Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete a few quizzes to get personalized AI-powered recommendations!
            </p>
            <Button onClick={() => handleStartQuiz()} className="gap-2">
              <Zap className="h-4 w-4" />
              Take Your First Quiz
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="difficulty" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Difficulty
              </TabsTrigger>
              <TabsTrigger value="weak-areas" className="gap-2">
                <Target className="h-4 w-4" />
                Focus Areas
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty Status */}
                {difficultyData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`border-2 ${
                      hasDifficultyChange 
                        ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' 
                        : 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            hasDifficultyChange ? 'bg-green-500/20' : 'bg-blue-500/20'
                          }`}>
                            {hasDifficultyChange ? (
                              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Current Difficulty</p>
                            <p className="font-bold capitalize">{difficultyData.difficulty}</p>
                            {difficultyData.averageScore !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Avg: {difficultyData.averageScore}%
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Weak Areas Status */}
                {weakAreaData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card className={`border-2 ${
                      hasWeakAreas 
                        ? 'border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20' 
                        : 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            hasWeakAreas ? 'bg-orange-500/20' : 'bg-green-500/20'
                          }`}>
                            {hasWeakAreas ? (
                              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Focus Areas</p>
                            <p className="font-bold">
                              {hasWeakAreas 
                                ? `${weakAreaData.weakCategories.length} to improve` 
                                : 'All strong!'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Overall: {weakAreaData.overallAccuracy}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  Recommended Actions
                </h4>
                
                {hasDifficultyChange && difficultyData && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <p className="font-semibold text-sm">Try {difficultyData.difficulty} difficulty!</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {difficultyData.notification || `You're ready for more challenging questions`}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleStartQuiz(undefined, difficultyData.difficulty)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    </div>
                  </motion.div>
                )}

                {hasWeakAreas && weakAreaData && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-800 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <p className="font-semibold text-sm">Practice {weakAreaData.weakCategories[0]}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Boost your score from {Math.round(weakAreaData.categoryPerformance[weakAreaData.weakCategories[0]])}% to {weakAreaData.overallAccuracy}%
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleStartQuiz(weakAreaData.weakCategories[0])}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Practice
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </TabsContent>

            {/* Difficulty Tab */}
            <TabsContent value="difficulty" className="space-y-4">
              {difficultyData ? (
                <>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">Current Level</h4>
                        <p className="text-2xl font-bold capitalize mt-1">{difficultyData.difficulty}</p>
                      </div>
                      {difficultyData.averageScore !== undefined && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Recent Average</p>
                          <p className="text-2xl font-bold">{difficultyData.averageScore}%</p>
                        </div>
                      )}
                    </div>
                    
                    {hasDifficultyChange && difficultyData.oldDifficulty && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Difficulty Increased!</p>
                          <p className="text-xs text-muted-foreground">
                            {difficultyData.oldDifficulty} → {difficultyData.difficulty}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {difficultyData.notification && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm leading-relaxed">{difficultyData.notification}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleStartQuiz(undefined, difficultyData.difficulty)}
                    className="w-full"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Start Quiz at {difficultyData.difficulty} Level
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Complete more quizzes to get difficulty recommendations</p>
                </div>
              )}
            </TabsContent>

            {/* Weak Areas Tab */}
            <TabsContent value="weak-areas" className="space-y-4">
              {weakAreaData ? (
                hasWeakAreas ? (
                  <>
                    <div className="space-y-3">
                      {weakAreaData.weakCategories.map((category, index) => {
                        const performance = weakAreaData.categoryPerformance[category] || 0;
                        const performancePercent = Math.round(performance);
                        
                        return (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 * index }}
                            className="p-4 rounded-lg bg-muted/50 border border-orange-200 dark:border-orange-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{category}</span>
                                <Badge variant="outline" className="text-xs">
                                  {performancePercent}%
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartQuiz(category)}
                              >
                                <BookOpen className="h-3 w-3 mr-1" />
                                Practice
                              </Button>
                            </div>
                            <Progress value={performancePercent} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Current: {performancePercent}%</span>
                              <span>Target: {weakAreaData.overallAccuracy}%</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                        Study Tips
                      </h4>
                      {weakAreaData.recommendations.map((rec, index) => {
                        // Strip leading bullet point if present
                        const cleanText = rec.replace(/^[\*\-]\s*/, '');
                        // Split by markdown bold tags
                        const parts = cleanText.split(/(\*\*.*?\*\*)/g);
                        
                        return (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                              {index + 1}
                            </div>
                            <p className="text-sm leading-relaxed">
                              {parts.map((part, i) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
                                }
                                return <span key={i}>{part}</span>;
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="font-semibold text-lg mb-2">Excellent Work!</h3>
                    <p className="text-sm text-muted-foreground">
                      You're performing well across all categories. Keep it up!
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Complete more quizzes to get personalized recommendations</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
