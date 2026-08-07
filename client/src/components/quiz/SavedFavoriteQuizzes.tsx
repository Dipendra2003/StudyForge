import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Heart, Trash2, Play, Loader2, Lock, Clock, Sparkles, Database, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface SavedQuiz {
  id: number;
  category: string;
  difficulty: string;
  questionTypes: string[];
  questionCount: number;
  timedMode?: boolean;
  timeLimit?: number;
  aiMode?: boolean;
  fullscreenMode?: boolean;
  isOfficial?: boolean;
  title?: string;
  description?: string;
  savedAt: string;
}

interface FavoriteQuiz {
  id: number;
  category: string;
  difficulty: string;
  questionTypes: string[];
  questionCount: number;
  timedMode?: boolean;
  timeLimit?: number;
  aiMode?: boolean;
  fullscreenMode?: boolean;
  isOfficial?: boolean;
  title?: string;
  description?: string;
  favoritedAt: string;
}

interface SavedFavoriteQuizzesProps {
  onStartQuiz?: (config: any) => void;
}

export function SavedFavoriteQuizzes({ onStartQuiz }: SavedFavoriteQuizzesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"saved" | "favorites">("saved");

  // Fetch saved quizzes
  const { data: savedQuizzes, isLoading: loadingSaved } = useQuery({
    queryKey: ["saved-quizzes"],
    queryFn: async () => {
      const data = await apiRequest<{ quizzes: SavedQuiz[] }>("/api/quiz/saved");
      return data.quizzes || [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch favorite quizzes
  const { data: favoriteQuizzes, isLoading: loadingFavorites } = useQuery({
    queryKey: ["favorite-quizzes"],
    queryFn: async () => {
      const data = await apiRequest<{ quizzes: FavoriteQuiz[] }>("/api/quiz/favorites");
      return data.quizzes || [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Remove saved quiz mutation
  const removeSavedMutation = useMutation({
    mutationFn: async (quizId: number) => {
      return apiRequest(`/api/quiz/saved/${quizId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-quizzes"] });
      toast({
        title: "Success",
        description: "Quiz removed from saved list",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove quiz",
      });
    },
  });

  // Remove favorite quiz mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (quizId: number) => {
      return apiRequest(`/api/quiz/favorites/${quizId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-quizzes"] });
      toast({
        title: "Success",
        description: "Quiz removed from favorites",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove quiz from favorites",
      });
    },
  });

  const handleStartQuiz = (quiz: SavedQuiz | FavoriteQuiz) => {
    if (onStartQuiz) {
      onStartQuiz({
        category: quiz.category,
        difficulty: quiz.difficulty,
        questionTypes: quiz.questionTypes,
        questionCount: quiz.questionCount,
        timedMode: quiz.timedMode !== undefined ? quiz.timedMode : false,
        timeLimit: quiz.timeLimit || 300,
        aiMode: quiz.aiMode !== undefined ? quiz.aiMode : true,
        fullscreenMode: quiz.fullscreenMode !== undefined ? quiz.fullscreenMode : false,
      });
    }
  };

  const difficultyColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const renderQuizCard = (quiz: SavedQuiz | FavoriteQuiz, type: "saved" | "favorite") => {
    const isSaved = type === "saved";
    const isRemoving = isSaved ? removeSavedMutation.isPending : removeFavoriteMutation.isPending;

    return (
      <motion.div
        key={quiz.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`hover:shadow-lg transition-all ${quiz.isOfficial ? 'border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-background shadow-md' : ''}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                {quiz.isOfficial && (
                  <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 text-white border-none flex items-center gap-1 w-fit shadow-2xs mb-1">
                    <ShieldCheck className="w-3 h-3" /> OFFICIAL STUDYFORGE EXAM SET
                  </Badge>
                )}
                <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                  {isSaved ? (
                    <Bookmark className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Heart className="h-5 w-5 text-red-500 fill-red-500 shrink-0" />
                  )}
                  <span>{quiz.title || `${quiz.category} Quiz`}</span>
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-muted-foreground mt-1 line-clamp-2">
                  {quiz.description || `${quiz.questionCount} questions assessment on ${quiz.category}`}
                </CardDescription>
              </div>
              {!quiz.isOfficial && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-red-500/10 hover:text-red-600 rounded-xl"
                  onClick={() => {
                    if (isSaved) {
                      removeSavedMutation.mutate(quiz.id);
                    } else {
                      removeFavoriteMutation.mutate(quiz.id);
                    }
                  }}
                  disabled={isRemoving}
                  title="Remove study set"
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge className={`${difficultyColors[quiz.difficulty as keyof typeof difficultyColors]} font-extrabold text-[11px] uppercase`}>
                  {quiz.difficulty}
                </Badge>
                <Badge variant="outline" className="font-bold text-[11px] bg-background/60">{quiz.category}</Badge>
                <Badge variant="secondary" className="font-extrabold text-[11px] bg-primary/10 text-primary">{quiz.questionCount} questions</Badge>
                {quiz.fullscreenMode && (
                  <Badge variant="outline" className="text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3 h-3" /> STRICT PROCTORING
                  </Badge>
                )}
                {quiz.timedMode && (
                  <Badge variant="outline" className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3 h-3" /> {Math.floor((quiz.timeLimit || 300) / 60)}m TIMED
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] font-black border flex items-center gap-1 shadow-2xs ${quiz.aiMode !== false ? 'bg-sky-500/10 text-sky-600 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}`}>
                  {quiz.aiMode !== false ? <Sparkles className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                  {quiz.aiMode !== false ? 'AI SYNTHESIS' : 'VERIFIED DB BANK'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {quiz.questionTypes && (Array.isArray(quiz.questionTypes) ? quiz.questionTypes : [quiz.questionTypes]).map((type, index) => (
                  <Badge key={index} variant="secondary" className="text-[10px] font-mono font-bold bg-muted/60 px-2 py-0.5">
                    {type === 'mcq' || type === 'MCQ' ? '⚡ Multiple Choice' : type === 'short_answer' ? '📝 Short Answer' : `📌 ${type}`}
                  </Badge>
                ))}
              </div>
              <Button
                className={`w-full rounded-xl font-black shadow-md h-10 ${quiz.isOfficial || quiz.fullscreenMode ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-indigo-500/20' : ''}`}
                onClick={() => handleStartQuiz(quiz)}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                {quiz.fullscreenMode ? 'Launch Proctored Assessment' : 'Start Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={activeTab === "saved" ? "default" : "outline"}
          onClick={() => setActiveTab("saved")}
          className="flex-1"
        >
          <Bookmark className="mr-2 h-4 w-4" />
          Saved ({savedQuizzes?.length || 0})
        </Button>
        <Button
          variant={activeTab === "favorites" ? "default" : "outline"}
          onClick={() => setActiveTab("favorites")}
          className="flex-1"
        >
          <Heart className="mr-2 h-4 w-4" />
          Favorites ({favoriteQuizzes?.length || 0})
        </Button>
      </div>

      {activeTab === "saved" && (
        <div className="space-y-4">
          {loadingSaved ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedQuizzes && savedQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedQuizzes.map((quiz) => renderQuizCard(quiz, "saved"))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved quizzes yet</p>
                <p className="text-sm mt-2">Save quizzes to take them later</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="space-y-4">
          {loadingFavorites ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : favoriteQuizzes && favoriteQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteQuizzes.map((quiz) => renderQuizCard(quiz, "favorite"))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite quizzes yet</p>
                <p className="text-sm mt-2">Mark quizzes as favorites for quick access</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
