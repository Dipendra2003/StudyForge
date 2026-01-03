import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Heart, Trash2, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SavedQuiz {
  id: number;
  category: string;
  difficulty: string;
  questionTypes: string[];
  questionCount: number;
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
      const response = await apiRequest("/api/quiz/saved");
      if (!response.ok) throw new Error("Failed to fetch saved quizzes");
      const data = await response.json();
      return data.quizzes as SavedQuiz[];
    },
  });

  // Fetch favorite quizzes
  const { data: favoriteQuizzes, isLoading: loadingFavorites } = useQuery({
    queryKey: ["favorite-quizzes"],
    queryFn: async () => {
      const response = await apiRequest("/api/quiz/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorite quizzes");
      const data = await response.json();
      return data.quizzes as FavoriteQuiz[];
    },
  });

  // Remove saved quiz mutation
  const removeSavedMutation = useMutation({
    mutationFn: async (quizId: number) => {
      const response = await apiRequest(`/api/quiz/saved/${quizId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove saved quiz");
      return response.json();
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
      const response = await apiRequest(`/api/quiz/favorites/${quizId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove favorite quiz");
      return response.json();
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
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isSaved ? (
                    <Bookmark className="h-5 w-5 text-primary" />
                  ) : (
                    <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                  )}
                  {quiz.title || `${quiz.category} Quiz`}
                </CardTitle>
                <CardDescription className="mt-1">
                  {quiz.description || `${quiz.questionCount} questions`}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSaved) {
                    removeSavedMutation.mutate(quiz.id);
                  } else {
                    removeFavoriteMutation.mutate(quiz.id);
                  }
                }}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={difficultyColors[quiz.difficulty as keyof typeof difficultyColors]}>
                  {quiz.difficulty}
                </Badge>
                <Badge variant="outline">{quiz.category}</Badge>
                <Badge variant="secondary">{quiz.questionCount} questions</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {quiz.questionTypes.map((type, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => handleStartQuiz(quiz)}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Quiz
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
