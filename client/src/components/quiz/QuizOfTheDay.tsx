import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Trophy, 
  Flame, 
  Star, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2,
  Clock,
  Target,
  Award,
  Share2
} from "lucide-react";
import confetti from "canvas-confetti";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareStreakModal } from "./ShareStreakModal";

interface QuizOfTheDay {
  id: string;
  date: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  title: string;
  description: string;
  isTrending: boolean;
  bonusPoints: number;
  completed: boolean;
}

interface QOTDStats {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalBonusPoints: number;
  globalXP?: number;
}

export function QuizOfTheDay() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [quizOfTheDay, setQuizOfTheDay] = useState<QuizOfTheDay | null>(null);
  const [stats, setStats] = useState<QOTDStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }
    
    fetchQuizOfTheDay();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!quizOfTheDay?.completed) return;

    // Trigger confetti on mount if completed
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("00h 00m 00s");
        return;
      }
      
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [quizOfTheDay?.completed]);



  const fetchQuizOfTheDay = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet("/api/quiz-of-the-day");

      if (!response.ok) {
        // Silently handle authentication errors (user not logged in)
        if (response.status === 401) {
          return;
        }
        throw new Error("Failed to fetch Quiz of the Day");
      }

      const data = await response.json();
      setQuizOfTheDay(data.quizOfTheDay);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching Quiz of the Day:", error);
      // Only show toast for non-auth errors
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load Quiz of the Day. Please try again later.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!quizOfTheDay) return;

    // Navigate to quiz mode with Quiz of the Day configuration
    navigate(
      `/quiz-mode?category=${encodeURIComponent(quizOfTheDay.category)}&difficulty=${quizOfTheDay.difficulty}&count=${quizOfTheDay.questionCount}&qotd=true`
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'hard':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quizOfTheDay) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/10 opacity-50" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
        </div>

        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 relative"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {quizOfTheDay.isTrending ? (
                  <TrendingUp className="h-6 w-6 text-primary" />
                ) : (
                  <Star className="h-6 w-6 text-primary" />
                )}
                {quizOfTheDay.isTrending && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </motion.div>
                )}
              </motion.div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Quiz of the Day
                  {quizOfTheDay.completed && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {quizOfTheDay.isTrending && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                      <Flame className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {(() => {
                    // Parse date string without timezone conversion
                    const [year, month, day] = quizOfTheDay.date.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return localDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  })()}
                </CardDescription>
              </div>
            </div>
            {!quizOfTheDay.completed && (
              <Button 
                onClick={handleStartQuiz}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Start Challenge
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-4">
          {/* Quiz Details */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <h3 className="font-semibold text-lg mb-2">{quizOfTheDay.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{quizOfTheDay.description}</p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={getDifficultyColor(quizOfTheDay.difficulty)}>
                <Target className="h-3 w-3 mr-1" />
                {quizOfTheDay.difficulty.charAt(0).toUpperCase() + quizOfTheDay.difficulty.slice(1)}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                <Clock className="h-3 w-3 mr-1" />
                {quizOfTheDay.questionCount} Questions
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                <Award className="h-3 w-3 mr-1" />
                +{quizOfTheDay.bonusPoints} XP Points
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div
                className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.totalCompleted}
                </p>
              </motion.div>

              <motion.div
                className={`p-3 rounded-lg border ${stats.currentStreak > 0 ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/10 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)] relative overflow-hidden' : 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20'}`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {stats.currentStreak > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-muted-foreground">Streak</span>
                </div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {stats.currentStreak}
                </p>
              </motion.div>

              <motion.div
                className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-muted-foreground">Best Streak</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.longestStreak}
                </p>
              </motion.div>

              <motion.div
                className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-muted-foreground">Total XP</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {stats.globalXP || 0}
                </p>
              </motion.div>
            </div>
          )}

          {quizOfTheDay.completed && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30 text-center relative overflow-hidden shadow-lg mt-2"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-24 h-24" />
              </div>
              <h4 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">
                🎉 Challenge Completed!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                You've completed today's challenge! Come back tomorrow for a new quiz.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <div className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-lg font-mono font-medium border border-border/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Next quiz in: {timeLeft}</span>
                </div>
                
                <Button 
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  className="bg-background/80 hover:bg-background border-primary/20 hover:border-primary/50 text-primary transition-all shadow-sm"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share My Streak
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
      
      {stats && (
        <ShareStreakModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          streak={stats.currentStreak}
        />
      )}
    </motion.div>
  );
}
