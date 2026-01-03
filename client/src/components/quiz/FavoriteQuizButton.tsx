import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";

interface FavoriteQuizButtonProps {
  category: string;
  difficulty: string;
  questionCount: number;
  disabled?: boolean;
}

export function FavoriteQuizButton({ category, difficulty, questionCount, disabled }: FavoriteQuizButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if quiz is already favorited
  const { data: isFavoriteData } = useQuery({
    queryKey: ["is-favorite", category, difficulty],
    queryFn: async () => {
      if (category === 'all' || difficulty === 'all') return { isFavorite: false };
      const response = await apiRequest(`/api/quiz/is-favorite?category=${category}&difficulty=${difficulty}`);
      if (!response.ok) return { isFavorite: false };
      return response.json();
    },
    enabled: category !== 'all' && difficulty !== 'all',
  });

  const isFavorite = isFavoriteData?.isFavorite || false;

  const favoriteQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/quiz/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          difficulty,
          questionTypes: ["mcq"],
          questionCount,
          title: `${category} - ${difficulty}`,
          description: `${questionCount} questions`,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to favorite quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["is-favorite", category, difficulty] });
      toast({
        title: "Success",
        description: "Quiz added to favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to favorite quiz",
      });
    },
  });

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      className="flex-1"
      onClick={() => favoriteQuizMutation.mutate()}
      disabled={disabled || favoriteQuizMutation.isPending || isFavorite}
    >
      {favoriteQuizMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          {isFavorite ? 'Favorited' : 'Favorite'}
        </>
      )}
    </Button>
  );
}
