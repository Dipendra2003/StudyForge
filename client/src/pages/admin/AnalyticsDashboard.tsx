import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  useTotalUsers, 
  useActiveUsers, 
  useTotalQuizAttempts, 
  useAverageQuizScore,
  useAIUsageStats,
  usePopularCategories,
  useUserGrowth
} from '@/hooks/useAdminQuery';
import { 
  Users, 
  UserCheck, 
  Target, 
  TrendingUp, 
  Cpu,
  Calendar,
  BarChart3,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { exportAnalyticsToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  loading?: boolean;
}

function MetricCard({ title, value, icon: Icon, iconColor, loading }: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${iconColor}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// Date Range Selector Component
interface DateRangeSelectorProps {
  value: 'day' | 'week' | 'month';
  onChange: (value: 'day' | 'week' | 'month') => void;
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'day' | 'week' | 'month')}
        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
      >
        <option value="day">Daily</option>
        <option value="week">Weekly</option>
        <option value="month">Monthly</option>
      </select>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = React.useState<'day' | 'week' | 'month'>('week');
  const { toast } = useToast();
  
  // Fetch analytics data - Requirements 12.1, 12.2, 12.3, 12.4, 12.5
  const { data: totalUsers, isLoading: loadingTotalUsers, refetch: refetchTotalUsers } = useTotalUsers();
  const { data: activeUsers, isLoading: loadingActiveUsers, refetch: refetchActiveUsers } = useActiveUsers(30);
  const { data: totalQuizAttempts, isLoading: loadingQuizAttempts, refetch: refetchQuizAttempts } = useTotalQuizAttempts();
  const { data: averageQuizScore, isLoading: loadingQuizScore, refetch: refetchQuizScore } = useAverageQuizScore();
  const { data: aiUsageStats, isLoading: loadingAIUsage, refetch: refetchAIUsage } = useAIUsageStats();
  
  // Fetch chart data - Requirements 12.6, 12.7
  const { data: popularCategories, isLoading: loadingCategories, refetch: refetchCategories } = usePopularCategories(10);
  const { data: userGrowth, isLoading: loadingUserGrowth, refetch: refetchUserGrowth } = useUserGrowth(dateRange);

  // Auto-refresh every 5 minutes - Requirement 12.10
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTotalUsers();
      refetchActiveUsers();
      refetchQuizAttempts();
      refetchQuizScore();
      refetchAIUsage();
      refetchCategories();
      refetchUserGrowth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refetchTotalUsers, refetchActiveUsers, refetchQuizAttempts, refetchQuizScore, refetchAIUsage, refetchCategories, refetchUserGrowth]);

  // Handle CSV export
  const handleExport = () => {
    try {
      const analyticsData = {
        'Total Users': (totalUsers as any)?.data?.total ?? 0,
        'Active Users (30 days)': (activeUsers as any)?.data?.active ?? 0,
        'Total Quiz Attempts': (totalQuizAttempts as any)?.data?.total ?? 0,
        'Average Quiz Score': (averageQuizScore as any)?.data?.average ? `${Math.round((averageQuizScore as any).data.average)}%` : '0%',
        'AI Total Requests': (aiUsageStats as any)?.data?.totalRequests ?? 0,
        'AI Tokens Consumed': (aiUsageStats as any)?.data?.tokensConsumed ?? 0,
        'AI Quota Remaining': (aiUsageStats as any)?.data?.quotaRemaining ?? 0,
      };

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analytics-export-${timestamp}.csv`;
      exportAnalyticsToCSV(analyticsData, filename);
      
      toast({
        title: 'Export successful',
        description: `Analytics data exported to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export analytics data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with export button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System metrics and performance statistics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={loadingTotalUsers || loadingActiveUsers}
          title="Export analytics to CSV"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Metric Cards - Requirements 12.1, 12.2, 12.3, 12.4, 12.5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Users"
          value={(totalUsers as any)?.data?.total ?? 0}
          icon={Users}
          iconColor="text-blue-500"
          loading={loadingTotalUsers}
        />
        <MetricCard
          title="Active Users (30d)"
          value={(activeUsers as any)?.data?.active ?? 0}
          icon={UserCheck}
          iconColor="text-green-500"
          loading={loadingActiveUsers}
        />
        <MetricCard
          title="Total Quiz Attempts"
          value={(totalQuizAttempts as any)?.data?.total ?? 0}
          icon={Target}
          iconColor="text-purple-500"
          loading={loadingQuizAttempts}
        />
        <MetricCard
          title="Avg Quiz Score"
          value={(averageQuizScore as any)?.data?.average ? `${Math.round((averageQuizScore as any).data.average)}%` : '0%'}
          icon={TrendingUp}
          iconColor="text-orange-500"
          loading={loadingQuizScore}
        />
        <MetricCard
          title="AI Requests"
          value={(aiUsageStats as any)?.data?.totalRequests ?? 0}
          icon={Cpu}
          iconColor="text-pink-500"
          loading={loadingAIUsage}
        />
      </div>

      {/* AI Usage Details Card - Requirement 12.5 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-pink-500" />
            AI Usage Statistics
          </CardTitle>
          <CardDescription>Detailed AI usage metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAIUsage ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Skeleton className="h-6 w-20 mx-auto mb-2" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-pink-50 dark:bg-pink-950 rounded-lg">
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {(aiUsageStats as any)?.data?.totalRequests ?? 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(aiUsageStats as any)?.data?.tokensConsumed?.toLocaleString() ?? 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tokens Consumed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(aiUsageStats as any)?.data?.quotaRemaining?.toLocaleString() ?? 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Quota Remaining</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Categories Bar Chart - Requirements 12.6, 12.9 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Popular Categories
            </CardTitle>
            <CardDescription>Top categories by usage</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCategories ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (popularCategories as any)?.data?.categories && (popularCategories as any).data.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(popularCategories as any).data.categories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Usage Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Growth Line Chart - Requirements 12.7, 12.8, 12.9 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  User Growth
                </CardTitle>
                <CardDescription>User registration over time</CardDescription>
              </div>
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUserGrowth ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (userGrowth as any)?.data?.growth && (userGrowth as any).data.growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(userGrowth as any).data.growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return dateRange === 'day' 
                        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : dateRange === 'week'
                        ? `Week ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="New Users"
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No user growth data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
