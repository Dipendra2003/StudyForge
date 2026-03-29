import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Clock, Target, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { Question, MCQData } from "@/../../shared/quiz-types";
import { isMCQData } from "@/../../shared/quiz-types";

interface QuizHistoryReviewDialogProps {
  attemptId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttemptDetails {
  attempt: {
    id: number;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
    category: string;
    difficulty: string;
    createdAt: string;
  };
  questions: Question[];
  questionAttempts: Array<{
    id: number;
    questionId: number;
    userAnswer: any;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export function QuizHistoryReviewDialog({
  attemptId,
  open,
  onOpenChange,
}: QuizHistoryReviewDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/quiz-attempts/${attemptId}`],
    queryFn: async () => {
      if (!attemptId) return null;
      const response = await apiRequest<{ data: AttemptDetails }>(
        `/api/quiz-attempts/${attemptId}`
      );
      console.log('Quiz attempt data:', response.data);
      return response.data;
    },
    enabled: !!attemptId && open,
  });

  if (!open || !attemptId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:max-w-4xl sm:h-[90vh] flex flex-col p-3 sm:p-6 gap-3 sm:gap-4">
        <DialogHeader className="flex-shrink-0 space-y-1 sm:space-y-2">
          <DialogTitle className="text-lg sm:text-xl">Quiz Review</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Review your answers and see detailed explanations
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">
            Failed to load quiz details. Please try again.
          </div>
        )}

        {data && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 sm:space-y-4 pr-3 sm:pr-4 pb-2">
                {/* Quiz Summary */}
                <Card className="border-2">
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wide">Score</p>
                        <p className="text-lg sm:text-2xl font-bold">{data.attempt.score}%</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wide">Correct</p>
                        <p className="text-lg sm:text-2xl font-bold">
                          {data.attempt.correctAnswers}/{data.attempt.totalQuestions}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wide">Time</p>
                        <p className="text-lg sm:text-2xl font-bold">
                          {Math.floor(data.attempt.timeSpent / 60)}:
                          {(data.attempt.timeSpent % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wide">Date</p>
                        <p className="text-[10px] sm:text-sm font-medium">
                          {format(new Date(data.attempt.createdAt), 'PP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-4">
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5">{data.attempt.category}</Badge>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">{data.attempt.difficulty}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions Review */}
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-sm sm:text-lg font-semibold px-1">Questions & Answers</h3>
                  {data.questions.length === 0 && (
                    <p className="text-muted-foreground text-center py-8 text-xs sm:text-sm">
                      No questions data available for this quiz attempt.
                    </p>
                  )}
                  {data.questions.map((question, index) => {
                    const attempt = data.questionAttempts.find(
                      (qa) => qa.questionId === question.id
                    );
                    
                    // Parse userAnswer if it's a string
                    let userAnswer = attempt?.userAnswer;
                    if (typeof userAnswer === 'string') {
                      try {
                        userAnswer = JSON.parse(userAnswer);
                      } catch (e) {
                        // If parsing fails, use as is
                      }
                    }
                    
                    const isCorrect = attempt?.isCorrect ?? false;
                    
                    console.log(`Question ${index + 1}:`, {
                      questionId: question.id,
                      hasAttempt: !!attempt,
                      userAnswer,
                      isCorrect,
                      correctAnswer: question.correctAnswer,
                      questionType: question.type,
                      questionData: question.questionData,
                      attemptData: attempt
                    });

                    return (
                      <Card key={`${question.id}-${index}`} className={`border-2 ${isCorrect ? 'border-green-300' : 'border-red-300'}`}>
                        <CardContent className="p-3 sm:p-6">
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 space-y-2 min-w-0">
                              <div>
                                <p className="font-medium text-xs sm:text-base leading-snug break-words">
                                  <span className="font-bold">Q{index + 1}:</span> {question.question}
                                </p>
                                <Badge variant={isCorrect ? "default" : "destructive"} className="mt-1.5 text-[10px] sm:text-xs px-2 py-0.5">
                                  {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                </Badge>
                              </div>

                              {question.type === 'mcq' && isMCQData(question.questionData) && (
                                <div className="space-y-1.5 sm:space-y-2">
                                  {question.questionData.options.map((option) => {
                                    // Normalize values to strings for comparison
                                    const normalizedUserAnswer = String(userAnswer || '').toLowerCase().trim();
                                    const normalizedOptionId = String(option.id || '').toLowerCase().trim();
                                    const normalizedCorrectAnswer = String(question.correctAnswer || '').toLowerCase().trim();
                                    
                                    const isUserAnswer = normalizedUserAnswer === normalizedOptionId;
                                    const isCorrectAnswer = normalizedCorrectAnswer === normalizedOptionId;
                                    
                                    // Debug logging
                                    if (index === 0) {
                                      console.log(`Question ${index + 1}, Option ${option.id}:`, {
                                        userAnswer,
                                        normalizedUserAnswer,
                                        correctAnswer: question.correctAnswer,
                                        normalizedCorrectAnswer,
                                        optionId: option.id,
                                        normalizedOptionId,
                                        isUserAnswer,
                                        isCorrectAnswer,
                                        isCorrect
                                      });
                                    }

                                    // Determine styling based on correctness
                                    let bgClass = 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700';
                                    
                                    if (isCorrectAnswer) {
                                      // Always show correct answer in green
                                      bgClass = 'bg-green-50 border-green-400 dark:bg-green-950 dark:border-green-600';
                                    } else if (isUserAnswer && !isCorrect) {
                                      // Show wrong user answer in red
                                      bgClass = 'bg-red-50 border-red-400 dark:bg-red-950 dark:border-red-600';
                                    }

                                    return (
                                      <div
                                        key={option.id}
                                        className={`p-2 sm:p-3 rounded-md border-2 ${bgClass}`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-xs sm:text-sm break-words flex-1 leading-snug">{option.text}</span>
                                          <div className="flex flex-col gap-1 flex-shrink-0">
                                            {isCorrectAnswer && (
                                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300 text-[9px] sm:text-xs whitespace-nowrap px-1.5 py-0">
                                                ✓ Correct
                                              </Badge>
                                            )}
                                            {isUserAnswer && isCorrect && (
                                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300 text-[9px] sm:text-xs whitespace-nowrap px-1.5 py-0">
                                                Your Pick
                                              </Badge>
                                            )}
                                            {isUserAnswer && !isCorrect && (
                                              <Badge variant="outline" className="bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300 text-[9px] sm:text-xs whitespace-nowrap px-1.5 py-0">
                                                Your Pick
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {question.explanation && (
                                <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200">
                                  <p className="text-[10px] sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    💡 Explanation:
                                  </p>
                                  <p className="text-[10px] sm:text-sm text-blue-800 dark:text-blue-200 break-words leading-snug">
                                    {question.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex justify-end pt-2 sm:pt-4 border-t flex-shrink-0">
          <Button onClick={() => onOpenChange(false)} size="sm" className="text-xs sm:text-sm h-8 sm:h-10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
