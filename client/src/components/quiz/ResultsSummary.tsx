import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Share2,
  Award,
  TrendingUp,
  Lightbulb,
  Quote,
} from "lucide-react";
import { QuizResults } from "./QuizPlayer";

interface ResultsSummaryProps {
  results: QuizResults;
  onRetry: () => void;
  onViewAnswers: () => void;
  onShare: () => void;
}

export default function ResultsSummary({
  results,
  onRetry,
  onViewAnswers,
  onShare,
}: ResultsSummaryProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti for high scores (>90%)
  useEffect(() => {
    if (results.score > 90) {
      setShowConfetti(true);
      
      // Fire confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          setShowConfetti(false);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Fire from left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        
        // Fire from right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [results.score]);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get badge color and icon
  const getBadgeDisplay = () => {
    if (!results.badge) return null;

    const badgeConfig = {
      gold: {
        color: "bg-gradient-to-br from-yellow-400 to-yellow-600",
        textColor: "text-yellow-900",
        icon: Trophy,
        label: "Gold Badge",
        description: "Outstanding! Score > 90%",
      },
      silver: {
        color: "bg-gradient-to-br from-gray-300 to-gray-500",
        textColor: "text-gray-900",
        icon: Award,
        label: "Silver Badge",
        description: "Great job! Score 70-89%",
      },
      bronze: {
        color: "bg-gradient-to-br from-orange-400 to-orange-600",
        textColor: "text-orange-900",
        icon: Award,
        label: "Bronze Badge",
        description: "Good effort! Score 50-69%",
      },
    };

    return badgeConfig[results.badge];
  };

  const badgeDisplay = getBadgeDisplay();

  // Get performance message
  const getPerformanceMessage = () => {
    if (results.score >= 90) {
      return {
        title: "Excellent Work! 🎉",
        message: "You've mastered this topic! Your performance is outstanding.",
        color: "text-green-600 dark:text-green-400",
      };
    } else if (results.score >= 70) {
      return {
        title: "Great Job! 👏",
        message: "You have a solid understanding. Keep up the good work!",
        color: "text-blue-600 dark:text-blue-400",
      };
    } else if (results.score >= 50) {
      return {
        title: "Good Effort! 💪",
        message: "You're making progress. Review the explanations to improve.",
        color: "text-yellow-600 dark:text-yellow-400",
      };
    } else {
      return {
        title: "Keep Learning! 📚",
        message: "Don't give up! Review the material and try again.",
        color: "text-orange-600 dark:text-orange-400",
      };
    }
  };

  const performanceMessage = getPerformanceMessage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* Main Results Card */}
      <Card className="overflow-hidden glass-card">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CardTitle className="text-3xl mb-2">Quiz Complete!</CardTitle>
            <CardDescription className={`text-lg font-medium ${performanceMessage.color}`}>
              {performanceMessage.title}
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              {performanceMessage.message}
            </p>
          </motion.div>

          {/* Motivational Quote */}
          {results.motivationalQuote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 px-4 py-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm italic text-gray-700 dark:text-gray-300 leading-relaxed">
                    "{results.motivationalQuote.text}"
                  </p>
                  {results.motivationalQuote.author && (
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      — {results.motivationalQuote.author}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <CircularProgress
              value={results.score}
              size={192}
              strokeWidth={12}
              animate={true}
              animationDuration={1.5}
              indicatorClassName={
                results.score >= 90
                  ? "text-green-500"
                  : results.score >= 70
                  ? "text-blue-500"
                  : results.score >= 50
                  ? "text-yellow-500"
                  : "text-orange-500"
              }
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-center"
              >
                <div className="text-6xl font-bold">{results.score}%</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your Score
                </div>
              </motion.div>
            </CircularProgress>
          </motion.div>

          {/* Badge Display */}
          <AnimatePresence>
            {badgeDisplay && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 1.2 }}
                className="flex flex-col items-center justify-center py-4"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
                  className={`${badgeDisplay.color} p-6 rounded-full shadow-2xl mb-3`}
                >
                  <badgeDisplay.icon className="h-12 w-12 text-white" strokeWidth={2.5} />
                </motion.div>
                <h3 className="text-xl font-bold">{badgeDisplay.label}</h3>
                <p className="text-sm text-muted-foreground">{badgeDisplay.description}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* Total Questions */}
            <Card className="glass-light">
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{results.totalQuestions}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </CardContent>
            </Card>

            {/* Correct Answers */}
            <Card className="glass-light bg-green-50/50 dark:bg-green-950/50 border-green-200 dark:border-green-800">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {results.correctAnswers}
                </div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </CardContent>
            </Card>

            {/* Incorrect Answers */}
            <Card className="glass-light bg-red-50/50 dark:bg-red-950/50 border-red-200 dark:border-red-800">
              <CardContent className="pt-6 text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {results.incorrectAnswers}
                </div>
                <div className="text-xs text-muted-foreground">Incorrect</div>
              </CardContent>
            </Card>

            {/* Time Taken */}
            <Card className="glass-light">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{formatTime(results.timeSpent)}</div>
                <div className="text-xs text-muted-foreground">Time</div>
              </CardContent>
            </Card>

            {/* Hints Used - Only show if hints were used */}
            {results.hintsUsed !== undefined && results.hintsUsed > 0 && (
              <Card className="glass-light bg-yellow-50/50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800">
                <CardContent className="pt-6 text-center">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {results.hintsUsed}
                  </div>
                  <div className="text-xs text-muted-foreground">Hints Used</div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Accuracy Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Accuracy
              </span>
              <span className="text-sm font-bold">{results.accuracy.toFixed(1)}%</span>
            </div>
            <Progress value={results.accuracy} className="h-3" />
          </motion.div>

          {/* Performance by Category */}
          {Object.keys(results.performanceByCategory).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-medium">Performance by Category</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(results.performanceByCategory).map(([category, count]) => (
                  <Badge key={category} variant="outline" className="justify-center py-2">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <Button
            onClick={onRetry}
            size="lg"
            variant="default"
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Quiz
          </Button>
          <Button
            onClick={onViewAnswers}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Answers
          </Button>
          <Button
            onClick={onShare}
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Results
          </Button>
        </CardFooter>
      </Card>

      {/* New Achievements */}
      <AnimatePresence>
        {results.newAchievements && results.newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 1.5 }}
          >
            <Card className="glass-gradient bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-950/80 dark:to-pink-950/80 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  New Achievements Unlocked!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.newAchievements.map((achievement) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg"
                    >
                      <div className="text-3xl">{achievement.badge}</div>
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {achievement.description}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
