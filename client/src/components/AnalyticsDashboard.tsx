import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Target, Award, Flame } from "lucide-react";
import { ReviewHeatmap } from "./ReviewHeatmap";
import { CategoryChart } from "./CategoryChart";
import { MasteryChart } from "./MasteryChart";
import { StreakDisplay } from "./StreakDisplay";

interface FlashcardAnalytics {
  reviewHistory: { date: string; count: number }[];
  accuracyByCategory: { category: string; accuracy: number; total: number }[];
  masteryLevels: { level: string; count: number }[];
  studyStreak: { current: number; longest: number };
  totalReviews: number;
  averageAccuracy: number;
}

export function AnalyticsDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/flashcards/analytics'],
    queryFn: async () => {
      const response = await apiRequest<{ analytics: FlashcardAnalytics }>('/api/flashcards/analytics');
      return response.analytics;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Charts Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load analytics data</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold">No Analytics Data</h3>
        <p className="text-gray-500">Start studying flashcards to see your analytics.</p>
      </div>
    );
  }

  const hasData = data.totalReviews > 0;

  return (
    <div className="space-y-6" role="main" aria-label="Analytics dashboard">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Summary statistics">
        <Card role="article" aria-label="Total reviews statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              Total Reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary" aria-label={`${data.totalReviews} total reviews`}>{data.totalReviews}</div>
          </CardContent>
        </Card>

        <Card role="article" aria-label="Average accuracy statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
              Average Accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500" aria-label={`${data.averageAccuracy} percent average accuracy`}>{data.averageAccuracy}%</div>
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
            <div className="text-3xl font-bold text-orange-500" aria-label={`${data.studyStreak.current} days current streak`}>{data.studyStreak.current} days</div>
          </CardContent>
        </Card>

        <Card role="article" aria-label="Longest streak statistic">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" aria-hidden="true" />
              Longest Streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500" aria-label={`${data.studyStreak.longest} days longest streak`}>{data.studyStreak.longest} days</div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Display */}
      <StreakDisplay 
        currentStreak={data.studyStreak.current} 
        longestStreak={data.studyStreak.longest} 
      />

      {/* Review Heatmap */}
      <Card role="region" aria-labelledby="review-activity-title">
        <CardHeader>
          <CardTitle id="review-activity-title">Review Activity</CardTitle>
          <CardDescription>Your study activity over the past 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <ReviewHeatmap data={data.reviewHistory} />
          ) : (
            <div className="text-center py-8 text-gray-500" role="status">
              No review activity yet. Start studying to see your progress!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Accuracy Chart */}
        <Card role="region" aria-labelledby="category-accuracy-title">
          <CardHeader>
            <CardTitle id="category-accuracy-title">Accuracy by Category</CardTitle>
            <CardDescription>Performance across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            {hasData && data.accuracyByCategory.length > 0 ? (
              <CategoryChart data={data.accuracyByCategory} />
            ) : (
              <div className="text-center py-8 text-gray-500" role="status">
                No category data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mastery Distribution Chart */}
        <Card role="region" aria-labelledby="mastery-distribution-title">
          <CardHeader>
            <CardTitle id="mastery-distribution-title">Mastery Distribution</CardTitle>
            <CardDescription>Your flashcard mastery levels</CardDescription>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <MasteryChart data={data.masteryLevels} />
            ) : (
              <div className="text-center py-8 text-gray-500" role="status">
                No mastery data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
