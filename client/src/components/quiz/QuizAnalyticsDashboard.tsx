import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Target, Award, Flame, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * QuizAnalyticsDashboard Component
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Displays comprehensive quiz performance analytics including:
 * - Total attempts and average score (8.1, 8.2)
 * - Improvement trend chart (8.3)
 * - Category performance breakdown (8.4)
 * - Difficulty performance breakdown (8.5)
 * - Streak information
 */

interface TrendData {
  date: string;
  averageScore: number;
  attemptsCount: number;
}

interface CategoryStats {
  category: string;
  attempts: number;
  averageScore: number;
  accuracy: number;
  masteryLevel: number;
}

interface DifficultyStats {
  difficulty: string;
  attempts: number;
  averageScore: number;
  accuracy: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: Date | null;
}

interface PerformanceData {
  totalAttempts: number;
  averageScore: number;
  improvementTrend: TrendData[];
  categoryPerformance: CategoryStats[];
  difficultyPerformance: DifficultyStats[];
  streakData: StreakInfo;
}

export function QuizAnalyticsDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/quiz/analytics'],
    queryFn: async () => {
      const response = await apiRequest<{ analytics: PerformanceData }>('/api/quiz/analytics');
      return response.analytics;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load quiz analytics</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold">No Quiz Data</h3>
        <p className="text-gray-500">Start taking quizzes to see your analytics.</p>
      </div>
    );
  }

  const hasData = data.totalAttempts > 0;
  const completionRate = hasData ? 100 : 0; // For now, assume all started quizzes are completed

  return (
    <div className="space-y-6" role="main" aria-label="Quiz analytics dashboard">
      {/* Summary Stats - Requirements 8.1, 8.2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Summary statistics">
        <Card role="article" aria-label="Total attempts statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              Total Attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary" aria-label={`${data.totalAttempts} total attempts`}>
              {data.totalAttempts}
            </div>
          </CardContent>
        </Card>

        <Card role="article" aria-label="Average score statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
              Average Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500" aria-label={`${Math.round(data.averageScore)} percent average score`}>
              {Math.round(data.averageScore)}%
            </div>
          </CardContent>
        </Card>

        <Card role="article" aria-label="Completion rate statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Completion Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500" aria-label={`${completionRate} percent completion rate`}>
              {completionRate}%
            </div>
          </CardContent>
        </Card>

        <Card role="article" aria-label="Current streak statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              Current Streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500" aria-label={`${data.streakData.currentStreak} days current streak`}>
              {data.streakData.currentStreak} days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Trend Chart - Requirement 8.3 */}
      {hasData && data.improvementTrend.length > 0 && (
        <Card role="region" aria-labelledby="improvement-trend-title">
          <CardHeader>
            <CardTitle id="improvement-trend-title">Improvement Trend</CardTitle>
            <CardDescription>Your quiz performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.improvementTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [`${value}%`, 'Average Score']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageScore" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Average Score"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance Chart - Requirement 8.4 */}
        <Card role="region" aria-labelledby="category-performance-title">
          <CardHeader>
            <CardTitle id="category-performance-title">Category Performance</CardTitle>
            <CardDescription>Performance across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            {hasData && data.categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${Math.round(value)}%`} />
                  <Legend />
                  <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score" />
                  <Bar dataKey="accuracy" fill="#10b981" name="Accuracy" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500" role="status">
                No category data available yet. Complete quizzes to see your performance by category.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Performance Chart - Requirement 8.5 */}
        <Card role="region" aria-labelledby="difficulty-performance-title">
          <CardHeader>
            <CardTitle id="difficulty-performance-title">Difficulty Performance</CardTitle>
            <CardDescription>Performance across difficulty levels</CardDescription>
          </CardHeader>
          <CardContent>
            {hasData && data.difficultyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.difficultyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="difficulty" />
                  <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${Math.round(value)}%`} />
                  <Legend />
                  <Bar dataKey="averageScore" fill="#8b5cf6" name="Average Score" />
                  <Bar dataKey="accuracy" fill="#ec4899" name="Accuracy" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500" role="status">
                No difficulty data available yet. Complete quizzes to see your performance by difficulty.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Streak Information */}
      {hasData && (
        <Card role="region" aria-labelledby="streak-info-title">
          <CardHeader>
            <CardTitle id="streak-info-title" className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streak Information
            </CardTitle>
            <CardDescription>Keep your learning momentum going!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {data.streakData.currentStreak}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak (days)</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data.streakData.longestStreak}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Longest Streak (days)</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.streakData.lastQuizDate 
                    ? new Date(data.streakData.lastQuizDate).toLocaleDateString()
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Last Quiz Date</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
