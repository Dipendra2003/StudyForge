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
      // Don't check if category or difficulty is empty
      if (!category || !difficulty || category === 'all' || difficulty === 'all') {
        return { isFavorite: false };
      }
      try {
        return await apiRequest(`/api/quiz/is-favorite?category=${category}&difficulty=${difficulty}`);
      } catch (error) {
        return { isFavorite: false };
      }
    },
    enabled: !!category && !!difficulty && category !== 'all' && difficulty !== 'all',
  });

  const isFavorite = isFavoriteData?.isFavorite || false;

  const favoriteQuizMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/quiz/favorite", {
        method: "POST",
        body: JSON.stringify({
          category,
          difficulty,
          questionTypes: ["mcq"],
          questionCount,
          title: `${category} - ${difficulty}`,
          description: `${questionCount} questions`,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["favorite-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["is-favorite", category, difficulty] });
      toast({
        title: "Success",
        description: "Quiz added to favorites",
      });
    },
    onError: (error: any) => {
      console.error('Failed to favorite quiz:', error);
      // Handle already favorited case
      if (error.status === 409) {
        toast({
          title: "Already Favorited",
          description: "This quiz is already in your favorites",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to favorite quiz",
        });
      }
    },
  });

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      className="flex-1"
      onClick={() => favoriteQuizMutation.mutate()}
      disabled={disabled || favoriteQuizMutation.isPending || !category || !difficulty}
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
