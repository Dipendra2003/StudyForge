import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Loader2 } from "lucide-react";

interface SaveQuizButtonProps {
  category: string;
  difficulty: string;
  questionCount: number;
  disabled?: boolean;
}

export function SaveQuizButton({ category, difficulty, questionCount, disabled }: SaveQuizButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/quiz/save", {
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
        throw new Error(error.error?.message || "Failed to save quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-quizzes"] });
      toast({
        title: "Success",
        description: "Quiz saved for later",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save quiz",
      });
    },
  });

  return (
    <Button
      variant="outline"
      className="flex-1"
      onClick={() => saveQuizMutation.mutate()}
      disabled={disabled || saveQuizMutation.isPending}
    >
      {saveQuizMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Bookmark className="mr-2 h-4 w-4" />
          Save
        </>
      )}
    </Button>
  );
}
