import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Loader2 } from "lucide-react";

interface SaveQuizButtonProps {
  category: string;
  difficulty: string;
  questionCount: number;
  questionTypes?: string[];
  disabled?: boolean;
}

export function SaveQuizButton({ category, difficulty, questionCount, questionTypes, disabled }: SaveQuizButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if quiz is already saved
  const { data: isSavedData } = useQuery({
    queryKey: ["is-saved", category, difficulty],
    queryFn: async () => {
      // Don't check if category or difficulty is empty
      if (!category || !difficulty) {
        return { isSaved: false };
      }
      try {
        // Check if this quiz configuration exists in saved quizzes
        const data = await apiRequest<{ quizzes: any[] }>("/api/quiz/saved");
        const quizzes = data.quizzes || [];
        const isSaved = quizzes.some(
          (q: any) => q.category === category && q.difficulty === difficulty
        );
        return { isSaved };
      } catch (error) {
        return { isSaved: false };
      }
    },
    enabled: !!category && !!difficulty,
  });

  const isSaved = isSavedData?.isSaved || false;

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/quiz/save", {
        method: "POST",
        body: JSON.stringify({
          category,
          difficulty,
          questionTypes: questionTypes || ["mcq"],
          questionCount,
          title: `${category} - ${difficulty}`,
          description: `${questionCount} questions`,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saved-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["is-saved", category, difficulty] });
      toast({
        title: "Success",
        description: "Quiz saved for later",
      });
    },
    onError: (error: any) => {
      console.error('Failed to save quiz:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save quiz",
      });
    },
  });

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      className="flex-1"
      onClick={() => saveQuizMutation.mutate()}
      disabled={disabled || saveQuizMutation.isPending || !category || !difficulty}
    >
      {saveQuizMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Bookmark className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </>
      )}
    </Button>
  );
}
