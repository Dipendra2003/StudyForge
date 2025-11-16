import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Study Streak
        </CardTitle>
        <CardDescription>Keep the momentum going!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Streak */}
          <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-lg border-2 border-orange-200 dark:border-orange-800">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="relative"
            >
              <Flame className="h-16 w-16 text-orange-500" />
              {currentStreak > 0 && (
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full"
                />
              )}
            </motion.div>
            <div className="mt-4 text-center">
              <div className="text-4xl font-bold text-orange-500">{currentStreak}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {currentStreak === 1 ? 'Day' : 'Days'} Current
              </div>
            </div>
            {currentStreak === 0 && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Study today to start your streak!
              </p>
            )}
          </div>

          {/* Longest Streak */}
          <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
            <Trophy className="h-16 w-16 text-yellow-500" />
            <div className="mt-4 text-center">
              <div className="text-4xl font-bold text-yellow-500">{longestStreak}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {longestStreak === 1 ? 'Day' : 'Days'} Best
              </div>
            </div>
            {currentStreak === longestStreak && currentStreak > 0 && (
              <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2 font-semibold">
                🎉 New record!
              </p>
            )}
          </div>
        </div>

        {/* Motivational message */}
        {currentStreak > 0 && (
          <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-center">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {currentStreak >= 7 
                ? "🔥 Amazing! You're on fire! Keep up the great work!"
                : currentStreak >= 3
                ? "💪 Great job! You're building a solid habit!"
                : "🌟 Nice start! Keep going to build your streak!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
