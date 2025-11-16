import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Trophy,
  TrendingUp,
  Target,
  Clock,
  Award,
  BarChart3,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  totalQuestions: number;
  totalCorrect: number;
  completionRate: number;
  byCategory: Record<string, {
    attempts: number;
    averageScore: number;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
  }>;
  byDifficulty: Record<string, {
    attempts: number;
    averageScore: number;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
  }>;
  recentAttempts: Array<{
    id: number;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    category: string;
    difficulty: string;
    timeSpent: number;
    createdAt: string;
  }>;
  improvementTrend: Array<{
    attempt: number;
    score: number;
    date: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function QuizProgress() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/quiz-attempts/stats'],
    queryFn: async () => {
      const response = await apiRequest<{ stats: QuizStats }>('/api/quiz-attempts/stats');
      return response.stats;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Progress</CardTitle>
          <CardDescription>
            No quiz attempts yet. Start taking quizzes to see your progress!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Prepare data for charts
  const categoryData = Object.entries(data.byCategory).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    score: stats.averageScore,
    accuracy: stats.accuracy,
    attempts: stats.attempts,
  }));

  const difficultyData = Object.entries(data.byDifficulty).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    score: stats.averageScore,
    accuracy: stats.accuracy,
    attempts: stats.attempts,
  }));

  const improvementData = data.improvementTrend.map(item => ({
    ...item,
    name: `#${item.attempt}`,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalQuestions} questions answered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              {data.totalCorrect} correct answers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Quizzes completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {improvementData.length > 1 
                ? `${improvementData[improvementData.length - 1].score - improvementData[0].score > 0 ? '+' : ''}${improvementData[improvementData.length - 1].score - improvementData[0].score}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 10 quizzes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="improvement" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="improvement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Improvement Trend</CardTitle>
              <CardDescription>
                Your performance over the last 10 quiz attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={improvementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Score (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
              <CardDescription>
                Average scores and accuracy across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" name="Avg Score (%)" />
                  <Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryData.map((cat, index) => (
              <Card key={cat.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{cat.attempts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <Badge variant="outline">{cat.score}%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <Badge variant="outline">{cat.accuracy}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Difficulty</CardTitle>
              <CardDescription>
                How you perform across different difficulty levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={difficultyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" name="Avg Score (%)" />
                  <Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficultyData.map((diff, index) => (
              <Card key={diff.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{diff.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{diff.attempts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <Badge variant="outline">{diff.score}%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <Badge variant="outline">{diff.accuracy}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Quiz Attempts</CardTitle>
              <CardDescription>
                Your last {data.recentAttempts.length} quiz attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {data.recentAttempts.map((attempt, index) => (
                    <Card key={attempt.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {attempt.category.charAt(0).toUpperCase() + attempt.category.slice(1)}
                              </Badge>
                              <Badge variant="secondary">
                                {attempt.difficulty.charAt(0).toUpperCase() + attempt.difficulty.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(attempt.createdAt), 'PPp')}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {attempt.correctAnswers}/{attempt.totalQuestions} correct
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(attempt.timeSpent / 60)}:{(attempt.timeSpent % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{attempt.score}%</div>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
