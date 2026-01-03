import { useState, useCallback } from 'react';

interface HintUsage {
  questionId: number;
  hintsUsed: number;
  hints: string[];
}

export function useHintTracking() {
  const [hintUsageByQuestion, setHintUsageByQuestion] = useState<Map<number, HintUsage>>(new Map());
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);

  const trackHintUsage = useCallback((questionId: number, hint: string, attemptNumber: number) => {
    setHintUsageByQuestion((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);

      if (existing) {
        newMap.set(questionId, {
          ...existing,
          hintsUsed: attemptNumber,
          hints: [...existing.hints, hint],
        });
      } else {
        newMap.set(questionId, {
          questionId,
          hintsUsed: attemptNumber,
          hints: [hint],
        });
      }

      return newMap;
    });

    setTotalHintsUsed((prev) => prev + 1);
  }, []);

  const getHintUsageForQuestion = useCallback((questionId: number): HintUsage | undefined => {
    return hintUsageByQuestion.get(questionId);
  }, [hintUsageByQuestion]);

  const resetHintTracking = useCallback(() => {
    setHintUsageByQuestion(new Map());
    setTotalHintsUsed(0);
  }, []);

  const getQuestionsWithHints = useCallback((): number[] => {
    return Array.from(hintUsageByQuestion.keys());
  }, [hintUsageByQuestion]);

  return {
    hintUsageByQuestion,
    totalHintsUsed,
    trackHintUsage,
    getHintUsageForQuestion,
    resetHintTracking,
    getQuestionsWithHints,
  };
}
