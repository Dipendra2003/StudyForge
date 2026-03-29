import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Share2,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { QuizHistoryReviewDialog } from "./QuizHistoryReviewDialog";
import { ShareQuizModal } from "./ShareQuizModal";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [shareAttempt, setShareAttempt] = useState<{id: number, score: number, totalQuestions: number} | null>(null);
  const [deleteAttemptId, setDeleteAttemptId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/quiz-attempts/stats'],
    queryFn: async () => {
      const response = await apiRequest<{ stats: QuizStats }>('/api/quiz-attempts/stats');
      return response.stats;
    }
  });

  // Fetch all quiz attempts for history management
  const { data: allAttempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: ['/api/quiz-attempts', { limit: 1000 }],
    queryFn: async () => {
      const response = await apiRequest<{ attempts: Array<{
        id: number;
        score: number;
        totalQuestions: number;
        correctAnswers: number;
        category: string;
        difficulty: string;
        timeSpent: number;
        createdAt: string;
      }> }>('/api/quiz-attempts?limit=1000');
      return response.attempts || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attemptId: number) => {
      return apiRequest(`/api/quiz-attempts/${attemptId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quiz-attempts/stats'] });
      toast({
        title: "Quiz Deleted",
        description: "Quiz attempt has been deleted successfully.",
      });
      setDeleteAttemptId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quiz attempt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort attempts
  const filteredAttempts = (allAttempts || [])
    .filter(attempt => {
      const matchesSearch = searchQuery === "" || 
        attempt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || attempt.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === "all" || attempt.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "score-desc":
          return b.score - a.score;
        case "score-asc":
          return a.score - b.score;
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAttempts.length / itemsPerPage);
  const paginatedAttempts = filteredAttempts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique categories and difficulties for filters
  const categories = Array.from(new Set((allAttempts || []).map(a => a.category)));
  const difficulties = Array.from(new Set((allAttempts || []).map(a => a.difficulty)));

  if (isLoading || isLoadingAttempts) {
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1 bg-muted">
          <TabsTrigger value="improvement" className="text-[10px] sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            Improvement
          </TabsTrigger>
          <TabsTrigger value="category" className="text-[10px] sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            By Category
          </TabsTrigger>
          <TabsTrigger value="difficulty" className="text-[10px] sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            By Difficulty
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] sm:text-sm px-2 py-2 data-[state=active]:bg-background">
            History
          </TabsTrigger>
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
              <CardTitle className="text-base sm:text-lg">Performance by Category</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Average scores and accuracy across different categories
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[300px]">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="score" fill="#8884d8" name="Avg Score (%)" />
                      <Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {categoryData.map((cat, index) => (
              <Card key={cat.name}>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-medium">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{cat.attempts}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <Badge variant="outline" className="text-xs">{cat.score}%</Badge>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <Badge variant="outline" className="text-xs">{cat.accuracy}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Performance by Difficulty</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                How you perform across different difficulty levels
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[300px]">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={difficultyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="score" fill="#8884d8" name="Avg Score (%)" />
                      <Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {difficultyData.map((diff, index) => (
              <Card key={diff.name}>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-medium">{diff.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-medium">{diff.attempts}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <Badge variant="outline" className="text-xs">{diff.score}%</Badge>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <Badge variant="outline" className="text-xs">{diff.accuracy}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiz History</CardTitle>
              <CardDescription>
                All your quiz attempts ({filteredAttempts.length} total) - Search, filter, and manage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by category or difficulty..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={(value) => {
                  setDifficultyFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {difficulties.map(diff => (
                      <SelectItem key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="score-desc">Highest Score</SelectItem>
                    <SelectItem value="score-asc">Lowest Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {paginatedAttempts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredAttempts.length)} of {filteredAttempts.length} results
                </span>
                {(searchQuery || categoryFilter !== "all" || difficultyFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setDifficultyFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Quiz Attempts List */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {paginatedAttempts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No quiz attempts found matching your filters.</p>
                      <Button
                        variant="link"
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter("all");
                          setDifficultyFilter("all");
                        }}
                        className="mt-2"
                      >
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    paginatedAttempts.map((attempt) => (
                      <Card 
                        key={attempt.id}
                        className="hover:shadow-md transition-all duration-200 group"
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div 
                              className="flex-1 space-y-2 cursor-pointer"
                              onClick={() => setSelectedAttemptId(attempt.id)}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {attempt.category.charAt(0).toUpperCase() + attempt.category.slice(1)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {attempt.difficulty.charAt(0).toUpperCase() + attempt.difficulty.slice(1)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(attempt.createdAt), 'PPp')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {attempt.correctAnswers}/{attempt.totalQuestions}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.floor(attempt.timeSpent / 60)}:{(attempt.timeSpent % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                              <p className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to review answers →
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-2xl font-bold">{attempt.score}%</div>
                                <p className="text-xs text-muted-foreground">Score</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedAttemptId(attempt.id)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Review Answers
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setShareAttempt({
                                    id: attempt.id,
                                    score: attempt.score,
                                    totalQuestions: attempt.totalQuestions
                                  })}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share Results
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteAttemptId(attempt.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quiz Review Dialog */}
      <QuizHistoryReviewDialog
        attemptId={selectedAttemptId}
        open={!!selectedAttemptId}
        onOpenChange={(open) => !open && setSelectedAttemptId(null)}
      />

      {/* Share Quiz Modal */}
      {shareAttempt && (
        <ShareQuizModal
          isOpen={!!shareAttempt}
          onClose={() => setShareAttempt(null)}
          quizAttemptId={shareAttempt.id}
          score={shareAttempt.score}
          totalQuestions={shareAttempt.totalQuestions}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAttemptId} onOpenChange={(open) => !open && setDeleteAttemptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz Attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this quiz attempt
              and remove it from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAttemptId && deleteMutation.mutate(deleteAttemptId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
