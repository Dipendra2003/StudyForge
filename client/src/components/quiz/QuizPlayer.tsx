import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import { CircularQuizProgress } from "./CircularQuizProgress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  Timer,
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipForward,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
  Maximize,
} from "lucide-react";
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
  Question,
  QuestionType,
  MCQData,
  TrueFalseData,
  FillBlankData,
  MatchingData,
  RearrangeData,
  isMCQData,
  isTrueFalseData,
  isFillBlankData,
  isMatchingData,
  isRearrangeData,
} from "@/../../shared/quiz-types";
import { QuizConfig } from "./QuizConfigurationPanel";
import { HintPanel } from "./HintPanel";
import { useHintTracking } from "@/hooks/useHintTracking";
import { MotivationalFeedback } from "./MotivationalFeedback";
import { generateMotivation, apiPost } from "@/lib/api";
import { getRandomMotivationalQuote } from "@/lib/motivationalQuotes";
import { useIsMobile } from "@/hooks/use-mobile";

export interface QuizResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  accuracy: number;
  badge?: 'gold' | 'silver' | 'bronze';
  newAchievements: Achievement[];
  bonusPoints?: number;
  performanceByCategory: Record<string, number>;
  hintsUsed?: number;
  questionsWithHints?: number[];
  motivationalQuote?: {
    text: string;
    author?: string;
  };
  userAnswers?: Record<number, any>;
  questionAttempts?: Record<number, QuestionAttempt>;
}

interface Achievement {
  id: number;
  type: string;
  name: string;
  description: string;
  badge: string;
  level: number;
  earnedAt: Date;
}

interface QuizPlayerProps {
  questions: Question[];
  config: QuizConfig;
  onComplete: (results: QuizResults) => void;
  onHintRequest?: (questionId: number) => Promise<string>;
  onQuit?: () => void;
}

interface QuestionAttempt {
  questionId: number;
  userAnswer: string | string[] | Record<string, string> | number[];
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
}

export default function QuizPlayer({
  questions,
  config,
  onComplete,
  onHintRequest,
  onQuit,
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAttempt>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[] | Record<string, string> | number[] | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showFeedbackAnimation, setShowFeedbackAnimation] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<string>("");
  const [showMotivation, setShowMotivation] = useState(false);
  const { toast } = useToast();
  const [motivationType, setMotivationType] = useState<'success' | 'support' | 'periodic'>('success');
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Quit confirmation dialog state
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  // Skip functionality
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
  const [isReviewingSkipped, setIsReviewingSkipped] = useState(false);
  
  // Store correct answers after submission (received from backend)
  const [revealedCorrectAnswers, setRevealedCorrectAnswers] = useState<Record<number, string | string[] | Record<string, string> | number[]>>({});
  
  // Use ref to track the latest answer value synchronously (fixes race condition)
  const currentAnswerRef = useRef<string | string[] | Record<string, string> | number[] | null>(null);
  
  // Use ref to prevent double submission race conditions
  const isSubmittingRef = useRef(false);
  
  // Hint tracking
  const { 
    totalHintsUsed, 
    trackHintUsage, 
    getHintUsageForQuestion,
    getQuestionsWithHints 
  } = useHintTracking();

  // Swipe gesture state
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isMobile = useIsMobile();

  // --- Auto-Save & Resume Logic ---
  const storageKey = `quiz-progress-${config.sessionId || `${questions[0]?.id}-${questions.length}`}`;
  
  // Load state on mount
  useEffect(() => {
    try {
      const savedStateStr = localStorage.getItem(storageKey);
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr);
        // Only load if question signature matches to avoid loading irrelevant state from previous attempts
        const firstQuestionText = questions[0]?.question || '';
        const isMatchingSignature = 
          savedState && 
          savedState.questionsLength === questions.length &&
          (!savedState.firstQuestionText || savedState.firstQuestionText === firstQuestionText);

        if (isMatchingSignature) {
          const loadedIndex = savedState.currentQuestionIndex || 0;
          const loadedAnswers = savedState.answers || {};
          
          setCurrentQuestionIndex(loadedIndex);
          setAnswers(loadedAnswers);
          setTimeSpent(savedState.timeSpent || 0);
          setScore(savedState.score || 0);
          setCorrectCount(savedState.correctCount || 0);
          setIncorrectCount(savedState.incorrectCount || 0);
          setSkippedQuestions(new Set(savedState.skippedQuestions || []));
          setIsReviewingSkipped(savedState.isReviewingSkipped || false);
          setRevealedCorrectAnswers(savedState.revealedCorrectAnswers || {});
          
          // Also explicitly restore the answer state for the currently displayed question
          const currentQuestionId = questions[loadedIndex]?.id;
          if (currentQuestionId && loadedAnswers[currentQuestionId]) {
            const attempt = loadedAnswers[currentQuestionId];
            setCurrentAnswer(attempt.userAnswer);
            if (currentAnswerRef) {
              currentAnswerRef.current = attempt.userAnswer;
            }
            setHasSubmitted(true);
            setIsAnswerCorrect(attempt.isCorrect);
          }
          
          if (Object.keys(loadedAnswers).length > 0 || loadedIndex > 0) {
            toast({
              title: "Quiz Resumed",
              description: "We've restored your progress from where you left off.",
            });
          }
        } else if (savedState) {
          // Disregard and clear stale progress from a different quiz
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error("Failed to load quiz progress", e);
    }
  }, [storageKey, questions, toast]);

  // Save state on change
  useEffect(() => {
    // Only save if we have meaningful progress
    if (timeSpent > 0 || Object.keys(answers).length > 0 || skippedQuestions.size > 0) {
      try {
        const stateToSave = {
          questionsLength: questions.length,
          firstQuestionText: questions[0]?.question || '',
          currentQuestionIndex,
          answers,
          timeSpent,
          score,
          correctCount,
          incorrectCount,
          skippedQuestions: Array.from(skippedQuestions),
          isReviewingSkipped,
          revealedCorrectAnswers
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Failed to save quiz progress", e);
      }
    }
  }, [
    storageKey, 
    questions.length, 
    currentQuestionIndex, 
    answers, 
    timeSpent, 
    score, 
    correctCount, 
    incorrectCount, 
    skippedQuestions, 
    isReviewingSkipped, 
    revealedCorrectAnswers
  ]);
  // --- End Auto-Save & Resume Logic ---

  // --- Fullscreen Mode Logic ---
  const quizContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track whether we intentionally exited fullscreen (quiz complete/quit)
  // to avoid showing the quit dialog in those cases
  const intentionalFullscreenExitRef = useRef(false);

  // Enter fullscreen on mount when fullscreenMode is enabled
  useEffect(() => {
    if (config.fullscreenMode) {
      const enterFullscreen = async () => {
        try {
          if (!document.fullscreenElement && quizContainerRef.current) {
            await quizContainerRef.current.requestFullscreen();
            setIsFullscreen(true);
          }
        } catch (err) {
          // Silently handle - user activation timer likely expired during AI question generation.
          // The "Fullscreen Exam Mode" launch screen will cleanly guide user interaction.
          console.log('User gesture required to enter fullscreen; displaying launch card.');
        }
      };
      // Small delay to let the component mount and transition in
      const timer = setTimeout(enterFullscreen, 200);
      return () => clearTimeout(timer);
    }
  }, [config.fullscreenMode]);

  // Listen for fullscreen exit — show quit dialog if user pressed Esc/F11
  useEffect(() => {
    if (!config.fullscreenMode) return;

    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      // If we left fullscreen AND it wasn't intentional (quiz complete/quit)
      if (!inFullscreen && !intentionalFullscreenExitRef.current) {
        setShowQuitDialog(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [config.fullscreenMode]);

  // Helper: exit fullscreen cleanly (used by quiz completion and quit)
  const exitFullscreen = useCallback(() => {
    if (config.fullscreenMode && document.fullscreenElement) {
      intentionalFullscreenExitRef.current = true;
      document.exitFullscreen().catch(() => {});
    }
  }, [config.fullscreenMode]);
  // --- End Fullscreen Mode Logic ---

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const totalAnswered = answeredCount + skippedQuestions.size;
  const progress = (totalAnswered / questions.length) * 100;
  const isCurrentQuestionSkipped = skippedQuestions.has(currentQuestion.id);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => {
        const newTime = prev + 1;
        // Auto-submit if timed mode and time limit reached
        if (config.timedMode && config.timeLimit && newTime >= config.timeLimit) {
          // Auto-submit the quiz when time runs out
          handleTimeExpired();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.timedMode, config.timeLimit]);

  // Reset or restore answer state when question changes
  useEffect(() => {
    // If we have a saved answer for this question (e.g., from loaded state after refresh)
    const savedAttempt = answers[currentQuestion.id];
    
    if (savedAttempt) {
      setCurrentAnswer(savedAttempt.userAnswer);
      currentAnswerRef.current = savedAttempt.userAnswer;
      setHasSubmitted(true);
      setIsAnswerCorrect(savedAttempt.isCorrect);
      setShowFeedbackAnimation(false);
      isSubmittingRef.current = false;
    } else {
      setCurrentAnswer(null);
      currentAnswerRef.current = null;
      setHasSubmitted(false);
      setIsAnswerCorrect(false);
      setShowFeedbackAnimation(false);
      setQuestionStartTime(Date.now());
      isSubmittingRef.current = false;
    }
    setShowMotivation(false); // Hide motivation when moving to next question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentQuestion.id]);

  // Handle question changes and periodic encouragement
  useEffect(() => {
    // Show periodic encouragement every 5 questions (but not on first question)
    if (currentQuestionIndex > 0 && currentQuestionIndex % 5 === 0) {
      fetchPeriodicEncouragement();
    }
  }, [currentQuestionIndex]);

  // Fetch periodic encouragement
  const fetchPeriodicEncouragement = async () => {
    try {
      const motivation = await generateMotivation({
        score,
        totalQuestions: questions.length,
        questionsAnswered: currentQuestionIndex,
        type: 'periodic',
      });

      setMotivationalMessage(motivation);
      setMotivationType('periodic');
      setShowMotivation(true);

      // Hide after 5 seconds
      setTimeout(() => setShowMotivation(false), 5000);
    } catch (error) {
      // Silently fail - periodic encouragement is not critical
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get remaining time for countdown
  const getRemainingTime = () => {
    if (!config.timedMode || !config.timeLimit) return null;
    return Math.max(0, config.timeLimit - timeSpent);
  };

  // Check if answer is correct
  const checkAnswer = useCallback((
    question: Question,
    userAnswer: string | string[] | Record<string, string> | number[]
  ): boolean => {
    const correctAnswer = question.correctAnswer;

    // MCQ - compare option IDs
    if (question.type === 'mcq') {
      return userAnswer === correctAnswer;
    }

    // True/False - compare boolean strings
    if (question.type === 'true-false') {
      return userAnswer.toString().toLowerCase() === correctAnswer.toString().toLowerCase();
    }

    // Fill in the blank - compare arrays
    if (question.type === 'fill-blank' && Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      if (userAnswer.length !== correctAnswer.length) return false;
      return userAnswer.every((ans, idx) => 
        String(ans).trim().toLowerCase() === String(correctAnswer[idx]).trim().toLowerCase()
      );
    }

    // Matching - compare objects
    if (question.type === 'matching' && typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
      const userObj = userAnswer as Record<string, string>;
      const correctObj = correctAnswer as Record<string, string>;
      const keys = Object.keys(correctObj);
      return keys.every(key => userObj[key] === correctObj[key]);
    }

    // Rearrange - compare arrays
    if (question.type === 'rearrange' && Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      if (userAnswer.length !== correctAnswer.length) return false;
      return userAnswer.every((val, idx) => val === correctAnswer[idx]);
    }

    return false;
  }, []);

  // Submit answer to backend for validation
  const submitAnswerToBackend = async (
    questionId: number, 
    userAnswer?: string | string[] | Record<string, string> | number[]
  ): Promise<{ isCorrect: boolean; correctAnswer: any }> => {
    try {
      const response = await apiPost('/api/quiz/validate-answer', {
        questionId,
        userAnswer
      });

      if (!response.ok) {
        throw new Error('Failed to validate answer');
      }

      const data = await response.json();
      return {
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer
      };
    } catch (error) {
      // Fallback to client-side validation if backend fails
      const fallbackIsCorrect = userAnswer !== undefined ? checkAnswer(currentQuestion, userAnswer) : false;
      return {
        isCorrect: fallbackIsCorrect,
        correctAnswer: currentQuestion.correctAnswer // Fallback only
      };
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    // Use ref value which is always up-to-date (no async state issues)
    // Also check state value as fallback - try both sources
    let answerToSubmit = currentAnswerRef.current;
    
    // If ref is empty, try state value
    if (answerToSubmit === null || answerToSubmit === undefined) {
      answerToSubmit = currentAnswer;
    }
    
    // Prevent double submission (using both state and ref for synchronous guarantee)
    if (hasSubmitted || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    
    // Validate we have an answer
    if (answerToSubmit === null || answerToSubmit === undefined) {
      isSubmittingRef.current = false;
      alert('Please select an answer before submitting');
      return;
    }
    
    // Check for empty arrays
    if (Array.isArray(answerToSubmit) && answerToSubmit.length === 0) {
      isSubmittingRef.current = false;
      alert('Please select an answer before submitting');
      return;
    }
    
    // Check for empty strings
    if (typeof answerToSubmit === 'string' && answerToSubmit.trim() === '') {
      isSubmittingRef.current = false;
      alert('Please select an answer before submitting');
      return;
    }
    
    // Check for empty objects (matching questions)
    if (typeof answerToSubmit === 'object' && !Array.isArray(answerToSubmit) && Object.keys(answerToSubmit).length === 0) {
      isSubmittingRef.current = false;
      alert('Please select an answer before submitting');
      return;
    }

    const questionTime = Math.floor((Date.now() - questionStartTime) / 1000);
    
    // Submit to backend for validation (secure)
    const result = await submitAnswerToBackend(currentQuestion.id, answerToSubmit);
    const isCorrect = result.isCorrect;
    
    // Store the correct answer received from backend (only available after submission)
    setRevealedCorrectAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: result.correctAnswer,
    }));
    
    // Get hint usage for this question
    const hintUsage = getHintUsageForQuestion(currentQuestion.id);
    const hintsUsedForQuestion = hintUsage?.hintsUsed || 0;

    // Update answers record
    const attempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      userAnswer: answerToSubmit,
      isCorrect,
      timeSpent: questionTime,
      hintsUsed: hintsUsedForQuestion,
    };

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: attempt,
    }));

    // Update score tracking and streak
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setScore(prev => prev + 1);
      setCurrentStreak(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
      setCurrentStreak(0); // Reset streak on incorrect answer
    }

    // Show feedback animation
    setIsAnswerCorrect(isCorrect);
    setShowFeedbackAnimation(true);
    setTimeout(() => setShowFeedbackAnimation(false), 2000);

    setHasSubmitted(true);

    // Generate motivational feedback
    fetchMotivationalFeedback(isCorrect);
    // DO NOT reset isSubmittingRef here. It should only be reset when navigating to the next question.
  };

  // Fetch motivational feedback based on answer
  const fetchMotivationalFeedback = async (isCorrect: boolean) => {
    try {
      const newStreak = isCorrect ? currentStreak + 1 : 0;
      const newScore = isCorrect ? score + 1 : score;
      
      const motivation = await generateMotivation({
        isCorrect,
        streak: newStreak >= 3 ? newStreak : undefined,
        score: newScore,
        totalQuestions: questions.length,
        type: 'answer',
      });

      setMotivationalMessage(motivation);
      setMotivationType(isCorrect ? 'success' : 'support');
      setShowMotivation(true);

      // Hide motivation after 5 seconds
      setTimeout(() => setShowMotivation(false), 5000);
    } catch (error) {
      // Fallback to simple messages
      const fallbackMessage = isCorrect 
        ? (currentStreak >= 2 ? `Amazing! ${currentStreak + 1} in a row! 🔥` : 'Great job! Keep it up! 👍')
        : 'Don\'t worry, learning from mistakes makes you stronger! 💪';
      
      setMotivationalMessage(fallbackMessage);
      setMotivationType(isCorrect ? 'success' : 'support');
      setShowMotivation(true);

      // Hide after a delay
      setTimeout(() => setShowMotivation(false), 3000);
    }
  };

  // Handle skip question
  const handleSkipQuestion = () => {
    // Mark question as skipped
    setSkippedQuestions(prev => new Set(prev).add(currentQuestion.id));
    
    // Move to next question
    if (isLastQuestion) {
      // If last question and there are skipped questions, start review
      if (skippedQuestions.size > 0 || !answers[currentQuestion.id]) {
        startSkippedReview();
      } else {
        handleQuizComplete();
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Start reviewing skipped questions
  const startSkippedReview = () => {
    const skippedIds = Array.from(skippedQuestions);
    if (skippedIds.length === 0) {
      handleQuizComplete();
      return;
    }
    
    // Find first skipped question
    const firstSkippedIndex = questions.findIndex(q => skippedIds.includes(q.id));
    if (firstSkippedIndex !== -1) {
      setIsReviewingSkipped(true);
      setCurrentQuestionIndex(firstSkippedIndex);
    } else {
      handleQuizComplete();
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (isReviewingSkipped) {
      // Remove current question from skipped list
      setSkippedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentQuestion.id);
        return newSet;
      });
      
      // Find next skipped question
      const remainingSkipped = Array.from(skippedQuestions).filter(id => id !== currentQuestion.id);
      if (remainingSkipped.length > 0) {
        const nextSkippedIndex = questions.findIndex(q => remainingSkipped.includes(q.id));
        if (nextSkippedIndex !== -1) {
          setCurrentQuestionIndex(nextSkippedIndex);
          return;
        }
      }
      
      // No more skipped questions
      setIsReviewingSkipped(false);
      handleQuizComplete();
    } else if (isLastQuestion) {
      // Check if there are skipped questions
      if (skippedQuestions.size > 0) {
        startSkippedReview();
      } else {
        handleQuizComplete();
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Handle swipe gesture for mobile navigation (Requirement 21.3)
  const handleSwipe = (event: any, info: PanInfo) => {
    // Only allow swipe if answer has been submitted
    if (!hasSubmitted || !isMobile) return;

    const swipeThreshold = 100; // pixels
    const swipeVelocityThreshold = 500; // pixels per second

    // Swipe left to go to next question
    if (info.offset.x < -swipeThreshold || info.velocity.x < -swipeVelocityThreshold) {
      setSwipeDirection('left');
      setTimeout(() => {
        handleNextQuestion();
        setSwipeDirection(null);
      }, 200);
    }
  };

  // Handle time expiration for timed quizzes
  const handleTimeExpired = useCallback(() => {
    // If there's a current answer that hasn't been submitted, submit it
    if (currentAnswer && !hasSubmitted) {
      const questionTime = Math.floor((Date.now() - questionStartTime) / 1000);
      const isCorrect = checkAnswer(currentQuestion, currentAnswer);

      const attempt: QuestionAttempt = {
        questionId: currentQuestion.id,
        userAnswer: currentAnswer,
        isCorrect,
        timeSpent: questionTime,
        hintsUsed: 0,
      };

      // Update answers with current question
      const updatedAnswers = {
        ...answers,
        [currentQuestion.id]: attempt,
      };

      // Complete quiz with updated data
      completeQuizWithData(updatedAnswers);
    } else {
      // No current answer, just complete with existing data
      completeQuizWithData(answers);
    }
  }, [currentAnswer, hasSubmitted, currentQuestion, questionStartTime, answers, checkAnswer]);

  // Complete quiz and calculate results
  const completeQuizWithData = (
    finalAnswers: Record<number, QuestionAttempt>,
  ) => {
    const totalQuestions = questions.length;
    
    // IMPORTANT: Derive counts from the actual answers map to prevent desync
    // Previously used separate correctCount/incorrectCount state counters which
    // could get out of sync with the answers record due to React's batched updates
    const finalCorrectCount = Object.values(finalAnswers).filter(a => a.isCorrect).length;
    const finalIncorrectCount = Object.values(finalAnswers).filter(a => !a.isCorrect).length;
    
    const accuracy = totalQuestions > 0 ? (finalCorrectCount / totalQuestions) * 100 : 0;
    
    // Determine badge
    let badge: 'gold' | 'silver' | 'bronze' | undefined;
    if (accuracy > 90) badge = 'gold';
    else if (accuracy >= 70) badge = 'silver';
    else if (accuracy >= 50) badge = 'bronze';

    // Calculate performance by category
    const performanceByCategory: Record<string, number> = {};
    questions.forEach(q => {
      const attempt = finalAnswers[q.id];
      if (attempt) {
        if (!performanceByCategory[q.category]) {
          performanceByCategory[q.category] = 0;
        }
        if (attempt.isCorrect) {
          performanceByCategory[q.category]++;
        }
      }
    });

    // Get a random motivational quote for the results
    const motivationalQuote = getRandomMotivationalQuote();

    // Extract user answers from attempts — use finalAnswers param, NOT answers state
    const userAnswers: Record<number, any> = {};
    Object.values(finalAnswers).forEach(attempt => {
      userAnswers[attempt.questionId] = attempt.userAnswer;
    });

    const results: QuizResults = {
      score: Math.round(accuracy),
      totalQuestions,
      correctAnswers: finalCorrectCount,
      incorrectAnswers: finalIncorrectCount,
      timeSpent,
      accuracy,
      badge,
      newAchievements: [],
      performanceByCategory,
      hintsUsed: totalHintsUsed,
      questionsWithHints: getQuestionsWithHints(),
      motivationalQuote: {
        text: motivationalQuote.text,
        author: motivationalQuote.author,
      },
      userAnswers,
      questionAttempts: finalAnswers,
    };

    // Clear saved progress on completion
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Failed to clear quiz progress", e);
    }

    // Exit fullscreen cleanly before showing results
    exitFullscreen();

    onComplete(results);
  };

  // Handle quiz completion (called when user clicks finish)
  const handleQuizComplete = () => {
    completeQuizWithData(answers);
  };

  // Render question based on type
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'mcq':
        return renderMCQ(currentQuestion);
      case 'true-false':
        return renderTrueFalse(currentQuestion);
      case 'fill-blank':
        return renderFillBlank(currentQuestion);
      case 'matching':
        return renderMatching(currentQuestion);
      case 'rearrange':
        return renderRearrange(currentQuestion);
      default:
        return <div>Unsupported question type</div>;
    }
  };

  // Render MCQ
  const renderMCQ = (question: Question) => {
    if (!isMCQData(question.questionData)) return null;
    const data = question.questionData as MCQData;
    const userAnswer = currentAnswer as string | null;
    
    // Get correct answer from revealed answers (only available after submission)
    const correctAnswer = revealedCorrectAnswers[question.id];

    return (
      <RadioGroup
        value={userAnswer || ""}
        onValueChange={(value) => {
          if (!hasSubmitted && value) {
            // Update ref FIRST (synchronous) then state
            currentAnswerRef.current = value;
            setCurrentAnswer(value);
          }
        }}
        className="space-y-3"
      >
        {data.options.map((option, index) => {
          const isSelected = userAnswer === option.id;
          const isCorrect = hasSubmitted && correctAnswer ? option.id === correctAnswer : false;
          const showFeedback = hasSubmitted;

          let optionClassName = "border p-3 md:p-4 rounded-md transition-all duration-300 min-h-[48px] md:min-h-0 touch-manipulation";
          if (showFeedback) {
            if (isCorrect) {
              optionClassName += " bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-700 shadow-lg shadow-green-200 dark:shadow-green-900";
            } else if (isSelected && !isCorrect) {
              optionClassName += " bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-700 shadow-lg shadow-red-200 dark:shadow-red-900";
            }
          } else if (isSelected) {
            optionClassName += " border-primary bg-primary/5 shadow-md";
          }

          return (
            <motion.div
              key={option.id}
              className={`${optionClassName} ${!hasSubmitted ? 'cursor-pointer' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: showFeedback && isCorrect ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                delay: index * 0.05,
                scale: { duration: 0.3 }
              }}
              onClick={() => {
                if (!hasSubmitted) {
                  currentAnswerRef.current = option.id;
                  setCurrentAnswer(option.id);
                }
              }}
            >
              <div className="flex items-start">
                <RadioGroupItem
                  value={option.id}
                  id={`option-${option.id}`}
                  disabled={hasSubmitted}
                  className="mt-1 h-5 w-5 md:h-4 md:w-4 flex-shrink-0"
                />
                <div className="ml-3 flex-1">
                  <Label
                    htmlFor={`option-${option.id}`}
                    className={`text-sm md:text-base font-normal ${hasSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {option.text}
                  </Label>
                  <AnimatePresence>
                    {showFeedback && isCorrect && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs md:text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1 font-medium"
                      >
                        <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
                        Correct answer
                      </motion.p>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs md:text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 font-medium"
                      >
                        <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                        Incorrect
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </RadioGroup>
    );
  };

  // Render True/False
  const renderTrueFalse = (question: Question) => {
    if (!isTrueFalseData(question.questionData)) return null;
    const data = question.questionData as TrueFalseData;
    const userAnswer = (currentAnswer as string) || undefined;
    
    // Get correct answer from revealed answers (only available after submission)
    const correctAnswer = revealedCorrectAnswers[question.id];

    const options = [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ];

    return (
      <div className="space-y-4">
        <RadioGroup
          value={userAnswer}
          onValueChange={(value) => {
            if (!hasSubmitted) {
              // Update ref FIRST (synchronous) then state
              currentAnswerRef.current = value;
              setCurrentAnswer(value);
            }
          }}
          className="space-y-3"
        >
          {options.map((option, index) => {
            const isSelected = userAnswer === option.id;
            const isCorrect = hasSubmitted && correctAnswer ? option.id === correctAnswer : false;
            const showFeedback = hasSubmitted;

            let optionClassName = "border p-3 md:p-4 rounded-md transition-all duration-300 min-h-[48px] md:min-h-0 touch-manipulation";
            if (showFeedback) {
              if (isCorrect) {
                optionClassName += " bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-700 shadow-lg shadow-green-200 dark:shadow-green-900";
              } else if (isSelected && !isCorrect) {
                optionClassName += " bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-700 shadow-lg shadow-red-200 dark:shadow-red-900";
              }
            } else if (isSelected) {
              optionClassName += " border-primary bg-primary/5";
            }

            return (
              <motion.div
                key={option.id}
                className={`${optionClassName} ${!hasSubmitted ? 'cursor-pointer' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: showFeedback && isCorrect ? [1, 1.02, 1] : 1,
                }}
                transition={{ 
                  delay: index * 0.1,
                  scale: { duration: 0.3 }
                }}
                onClick={() => {
                  if (!hasSubmitted) {
                    currentAnswerRef.current = option.id;
                    setCurrentAnswer(option.id);
                  }
                }}
              >
                <div className="flex items-center">
                  <RadioGroupItem
                    value={option.id}
                    id={`tf-${option.id}`}
                    disabled={hasSubmitted}
                    className="h-5 w-5 md:h-4 md:w-4"
                  />
                  <Label
                    htmlFor={`tf-${option.id}`}
                    className="ml-3 text-sm md:text-base font-medium cursor-pointer flex-1"
                  >
                    {option.text}
                  </Label>
                  <AnimatePresence>
                    {showFeedback && isCorrect && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", duration: 0.5 }}
                      >
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                      </motion.div>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", duration: 0.5 }}
                      >
                        <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </RadioGroup>
      </div>
    );
  };

  // Render Fill in the Blank
  const renderFillBlank = (question: Question) => {
    if (!isFillBlankData(question.questionData)) return null;
    const data = question.questionData as FillBlankData;
    const userAnswers = (currentAnswer as string[]) || [];
    
    // Initialize empty array if currentAnswer is null
    if (currentAnswer === null) {
      setCurrentAnswer([]);
      currentAnswerRef.current = [];
    }
    
    // Get correct answers from revealed answers (only available after submission)
    const correctAnswers = revealedCorrectAnswers[question.id] as string[] | undefined;

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {data.blanks.map((blank, index) => {
            const userAns = userAnswers[index] || "";
            const correctAns = correctAnswers ? correctAnswers[index] : undefined;
            const isCorrect = hasSubmitted && correctAns &&
              userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
            const isIncorrect = hasSubmitted && correctAns &&
              userAns.trim().toLowerCase() !== correctAns.trim().toLowerCase();

            return (
              <motion.div 
                key={blank.id} 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Label htmlFor={`blank-${blank.id}`}>
                  Blank {index + 1}
                </Label>
                <div className="relative">
                  <motion.div
                    animate={hasSubmitted ? {
                      scale: isCorrect ? [1, 1.02, 1] : [1, 0.98, 1]
                    } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Input
                      id={`blank-${blank.id}`}
                      value={userAns}
                      onChange={(e) => {
                        if (!hasSubmitted) {
                          const newAnswers = [...userAnswers];
                          newAnswers[index] = e.target.value;
                          setCurrentAnswer(newAnswers);
                          currentAnswerRef.current = newAnswers;
                        }
                      }}
                      disabled={hasSubmitted}
                      className={
                        hasSubmitted
                          ? isCorrect
                            ? "border-green-500 bg-green-50 dark:bg-green-950 shadow-lg shadow-green-200 dark:shadow-green-900 transition-all duration-300"
                            : "border-red-500 bg-red-50 dark:bg-red-950 shadow-lg shadow-red-200 dark:shadow-red-900 transition-all duration-300"
                          : ""
                      }
                      placeholder="Type your answer..."
                    />
                  </motion.div>
                  <AnimatePresence>
                    {hasSubmitted && (
                      <motion.div 
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", duration: 0.5 }}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {hasSubmitted && isIncorrect && correctAns && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-2"
                    >
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Correct answer: <span className="font-bold">{correctAns}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Matching with dropdown selection
  const renderMatching = (question: Question) => {
    if (!isMatchingData(question.questionData)) return null;
    const data = question.questionData as MatchingData;
    
    // Initialize user matches if not set
    const userMatches = (currentAnswer as Record<string, string>) || {};
    
    if (currentAnswer === null) {
      const initialMatches: Record<string, string> = {};
      setCurrentAnswer(initialMatches);
      currentAnswerRef.current = initialMatches;
    }
    
    // Get correct answer from revealed answers (only available after submission)
    const correctMatches = revealedCorrectAnswers[question.id] as Record<string, string> | undefined;
    
    // Handle match selection
    const handleMatchSelect = (leftId: string, rightId: string) => {
      if (hasSubmitted) return;
      
      const newMatches = { ...userMatches, [leftId]: rightId };
      setCurrentAnswer(newMatches);
      currentAnswerRef.current = newMatches;
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          Match each item from the left column with the correct item from the right column.
        </p>
        <div className="space-y-3">
          {data.leftColumn.map((leftItem, index) => {
            const selectedRightId = userMatches[leftItem.id];
            const correctRightId = correctMatches ? correctMatches[leftItem.id] : undefined;
            const isCorrect = hasSubmitted && correctRightId && selectedRightId === correctRightId;
            const isIncorrect = hasSubmitted && correctRightId && selectedRightId !== correctRightId;
            
            let containerClassName = "p-4 border-2 rounded-lg transition-all duration-300 ";
            if (hasSubmitted) {
              if (isCorrect) {
                containerClassName += "bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-700 shadow-lg shadow-green-200 dark:shadow-green-900";
              } else if (isIncorrect) {
                containerClassName += "bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-700 shadow-lg shadow-red-200 dark:shadow-red-900";
              }
            } else {
              containerClassName += "border-gray-300 dark:border-gray-700 bg-card";
            }

            return (
              <motion.div
                key={leftItem.id}
                className={containerClassName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: hasSubmitted && isCorrect ? [1, 1.02, 1] : 1,
                }}
                transition={{ 
                  delay: index * 0.05,
                  scale: { duration: 0.3 }
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-sm md:text-base font-medium">
                      {leftItem.text}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-muted-foreground hidden md:inline">→</span>
                    <select
                      value={selectedRightId || ""}
                      onChange={(e) => handleMatchSelect(leftItem.id, e.target.value)}
                      disabled={hasSubmitted}
                      className={`flex-1 h-10 rounded-md border px-3 py-2 text-sm ${
                        hasSubmitted
                          ? isCorrect
                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                            : "border-red-500 bg-red-50 dark:bg-red-950"
                          : "border-input bg-background"
                      } ${!hasSubmitted ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <option value="">Select match...</option>
                      {data.rightColumn.map(rightItem => (
                        <option key={rightItem.id} value={rightItem.id}>
                          {rightItem.text}
                        </option>
                      ))}
                    </select>
                    <AnimatePresence>
                      {hasSubmitted && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <AnimatePresence>
                  {hasSubmitted && isIncorrect && correctRightId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 pt-3 border-t border-green-200 dark:border-green-800"
                    >
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Correct match: <span className="font-bold">
                          {data.rightColumn.find(r => r.id === correctRightId)?.text}
                        </span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Rearrange with drag-and-drop functionality
  const renderRearrange = (question: Question) => {
    if (!isRearrangeData(question.questionData)) return null;
    const data = question.questionData as RearrangeData;
    
    // Initialize user order if not set (indices 0, 1, 2, ...)
    const userOrder = (currentAnswer as number[]) || data.items.map((_, idx) => idx);
    
    if (currentAnswer === null) {
      const initialOrder = data.items.map((_, idx) => idx);
      setCurrentAnswer(initialOrder);
      currentAnswerRef.current = initialOrder;
    }
    
    // Get correct answer from revealed answers (only available after submission)
    const correctOrder = revealedCorrectAnswers[question.id] as number[] | undefined;
    
    // Handle drag start
    const handleDragStart = (e: React.DragEvent, index: number) => {
      if (hasSubmitted) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    };
    
    // Handle drag over
    const handleDragOver = (e: React.DragEvent) => {
      if (hasSubmitted) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    
    // Handle drop
    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      if (hasSubmitted) return;
      e.preventDefault();
      
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (dragIndex === dropIndex) return;
      
      const newOrder = [...userOrder];
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedItem);
      
      setCurrentAnswer(newOrder);
      currentAnswerRef.current = newOrder;
    };
    
    // Move item up
    const moveUp = (index: number) => {
      if (hasSubmitted || index === 0) return;
      const newOrder = [...userOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setCurrentAnswer(newOrder);
      currentAnswerRef.current = newOrder;
    };
    
    // Move item down
    const moveDown = (index: number) => {
      if (hasSubmitted || index === userOrder.length - 1) return;
      const newOrder = [...userOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setCurrentAnswer(newOrder);
      currentAnswerRef.current = newOrder;
    };

    return (
      <div className="space-y-3">
        {userOrder.map((itemIndex, position) => {
          const item = data.items[itemIndex];
          const isCorrectPosition = hasSubmitted && correctOrder 
            ? correctOrder[position] === itemIndex 
            : false;
          const isIncorrectPosition = hasSubmitted && correctOrder 
            ? correctOrder[position] !== itemIndex 
            : false;
          
          let itemClassName = "p-4 border-2 rounded-lg transition-all duration-300 ";
          if (hasSubmitted) {
            if (isCorrectPosition) {
              itemClassName += "bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-700 shadow-lg shadow-green-200 dark:shadow-green-900";
            } else if (isIncorrectPosition) {
              itemClassName += "bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-700 shadow-lg shadow-red-200 dark:shadow-red-900";
            }
          } else {
            itemClassName += "border-gray-300 dark:border-gray-700 hover:border-primary hover:shadow-md cursor-move bg-card";
          }

          return (
            <motion.div
              key={`${itemIndex}-${position}`}
              draggable={!hasSubmitted}
              onDragStart={(e) => handleDragStart(e as any, position)}
              onDragOver={handleDragOver as any}
              onDrop={(e) => handleDrop(e as any, position)}
              className={itemClassName}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: hasSubmitted && isCorrectPosition ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                delay: position * 0.05,
                scale: { duration: 0.3 }
              }}
              whileHover={!hasSubmitted ? { scale: 1.02 } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveUp(position)}
                    disabled={hasSubmitted || position === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveDown(position)}
                    disabled={hasSubmitted || position === userOrder.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  {position + 1}
                </div>
                <div className="flex-1 text-sm md:text-base">
                  {item}
                </div>
                <AnimatePresence>
                  {hasSubmitted && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      {isCorrectPosition ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  const remainingTime = getRemainingTime();
  const isTimedMode = config.timedMode && config.timeLimit;

  return (
    <motion.div
      ref={quizContainerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`space-y-4 relative transition-all duration-300 ${
        isFullscreen 
          ? "w-full min-h-screen bg-background p-4 md:py-12 md:px-8 overflow-y-auto" 
          : ""
      }`}
    >
      {config.fullscreenMode && !isFullscreen ? (
        <Card className="w-full max-w-2xl mx-auto my-8 border-2 border-primary/20 shadow-xl glass-card text-center overflow-hidden">
          <div className="bg-primary/5 py-8 px-6 border-b border-border/50 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
              <Maximize className="h-8 w-8 animate-pulse" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              Fullscreen Exam Mode
            </CardTitle>
            <CardDescription className="text-sm md:text-base mt-2 max-w-md mx-auto">
              This quiz requires full-screen focus mode for an optimal and uninterrupted test environment.
            </CardDescription>
          </div>
          <CardContent className="py-6 px-6 space-y-4 text-left">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-4 text-amber-900 dark:text-amber-200 text-sm space-y-2">
              <p className="font-semibold flex items-center gap-2">
                ⚠️ Proctoring & Focus Guidelines:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-xs md:text-sm text-amber-800 dark:text-amber-300">
                <li>Entering fullscreen hides sidebars and navigation to maximize focus.</li>
                <li>Pressing <span className="font-semibold">Esc</span> or leaving full-screen mode will prompt to end your test.</li>
                <li>Ensure you are ready before proceeding into the exam environment.</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end bg-muted/20 px-6 py-4 border-t">
            {onQuit && (
              <Button
                variant="outline"
                onClick={onQuit}
                className="w-full sm:w-auto"
              >
                Cancel & Return
              </Button>
            )}
            <Button
              size="lg"
              onClick={async () => {
                try {
                  if (quizContainerRef.current) {
                    await quizContainerRef.current.requestFullscreen();
                    setIsFullscreen(true);
                  }
                } catch (err) {
                  console.error('Could not enter fullscreen:', err);
                  toast({
                    title: "Fullscreen Error",
                    description: "Your browser refused fullscreen permissions.",
                    variant: "destructive",
                  });
                }
              }}
              className="w-full sm:w-auto font-semibold shadow-lg shadow-primary/20"
            >
              <Maximize className="mr-2 h-4 w-4" />
              Enter Fullscreen & {Object.keys(answers).length > 0 ? "Resume Quiz" : "Start Quiz"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
      {/* Feedback Animation Overlay */}
      <AnimatePresence>
        {showFeedbackAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", duration: 0.6 }}
              className={`p-6 md:p-8 rounded-full ${
                isAnswerCorrect 
                  ? 'bg-green-500/90 dark:bg-green-600/90' 
                  : 'bg-red-500/90 dark:bg-red-600/90'
              } shadow-2xl`}
            >
              {isAnswerCorrect ? (
                <CheckCircle2 className="h-16 w-16 md:h-24 md:w-24 text-white" strokeWidth={3} />
              ) : (
                <XCircle className="h-16 w-16 md:h-24 md:w-24 text-white" strokeWidth={3} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe hint for mobile */}
      {isMobile && hasSubmitted && !isLastQuestion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Swipe left for next question</span>
          <ChevronRightIcon className="h-4 w-4" />
        </motion.div>
      )}

      <motion.div
        ref={cardRef}
        drag={isMobile && hasSubmitted ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipe}
        whileTap={isMobile && hasSubmitted ? { cursor: "grabbing" } : {}}
        className="touch-pan-y pb-6"
      >
        <Card className="w-full max-w-4xl mx-auto glass-card flex flex-col">
        <CardHeader className="pb-3 px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                {/* Close/Exit Quiz Button */}
                {onQuit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuitDialog(true)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors -ml-1 mr-1"
                    title="Exit Quiz"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="text-lg md:text-xl">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardTitle>
                {isReviewingSkipped && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                    Reviewing Skipped
                  </Badge>
                )}
                {isCurrentQuestionSkipped && !isReviewingSkipped && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                    Skipped
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">{currentQuestion.category}</Badge>
                <Badge variant="outline" className="text-xs">
                  {currentQuestion.difficulty.charAt(0).toUpperCase() + 
                   currentQuestion.difficulty.slice(1)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentQuestion.type.split('-').map(w => 
                    w.charAt(0).toUpperCase() + w.slice(1)
                  ).join(' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 justify-between md:justify-end">
              {/* Score Display */}
              <div className="text-center md:text-right">
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {correctCount}/{questions.length}
                </div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
              {/* Timer Display */}
              <div className="text-center md:text-right">
                <div className={`text-xl md:text-2xl font-bold ${
                  isTimedMode && remainingTime !== null && remainingTime < 60 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-primary'
                }`}>
                  {isTimedMode && remainingTime !== null ? (
                    <>
                      <Timer className="inline h-4 w-4 md:h-5 md:w-5 mr-1" />
                      {formatTime(remainingTime)}
                    </>
                  ) : (
                    <>
                      <Clock className="inline h-4 w-4 md:h-5 md:w-5 mr-1" />
                      {formatTime(timeSpent)}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isTimedMode ? 'Remaining' : 'Elapsed'}
                </div>
              </div>
            </div>
          </div>
          {/* Progress Bar with Circular Indicator */}
          <div className="flex items-center gap-2 md:gap-4 mt-3">
            <Progress value={progress} className="h-2 flex-1" />
            {!isMobile && (
              <CircularQuizProgress
                currentQuestion={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                size={48}
                strokeWidth={4}
                showQuestionNumbers={true}
                animate={true}
                animationDuration={0.5}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
          {/* Question Text */}
          <div>
            <h3 className="text-base md:text-lg font-medium mb-4">{currentQuestion.question}</h3>
          </div>

          {/* Question Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderQuestion()}
            </motion.div>
          </AnimatePresence>

          {/* Hint Panel - Only show before submission */}
          {!hasSubmitted && (
            <HintPanel
              questionId={currentQuestion.id}
              sessionId={config.sessionId}
              onHintUsed={(hint, attemptNumber) => {
                trackHintUsage(currentQuestion.id, hint, attemptNumber);
              }}
              disabled={hasSubmitted}
            />
          )}

          {/* Explanation (shown after submission) */}
          <AnimatePresence>
            {hasSubmitted && currentQuestion.explanation && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeOut"
                }}
                className="mt-6"
              >
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 shadow-lg">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <strong className="text-blue-700 dark:text-blue-300">Explanation:</strong> {currentQuestion.explanation}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivational Feedback */}
          <MotivationalFeedback
            message={motivationalMessage}
            visible={showMotivation}
            type={motivationType}
          />
        </CardContent>

        <CardFooter className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 px-4 md:px-6 py-4 mt-auto border-t bg-card/50 backdrop-blur-sm sticky bottom-0 z-20">
          <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {correctCount} Correct
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm">
              <XCircle className="h-3 w-3 text-red-600" />
              {incorrectCount} Incorrect
            </Badge>
            {skippedQuestions.size > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                <SkipForward className="h-3 w-3" />
                {skippedQuestions.size} Skipped
              </Badge>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {!hasSubmitted ? (
              <>
                <Button
                  onClick={handleSkipQuestion}
                  variant="outline"
                  size="lg"
                  className="flex-1 md:flex-none h-12 md:h-10 text-base md:text-sm touch-manipulation"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip
                </Button>
                <Button
                  onClick={handleSubmitAnswer}
                  size="lg"
                  className="flex-1 md:flex-none h-12 md:h-10 text-base md:text-sm touch-manipulation font-semibold"
                >
                  Submit Answer
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleNextQuestion} 
                size="lg"
                className="w-full md:w-auto h-12 md:h-10 text-base md:text-sm touch-manipulation"
              >
                {isReviewingSkipped 
                  ? (skippedQuestions.size > 1 ? 'Next Skipped' : 'Finish Quiz')
                  : (isLastQuestion 
                      ? (skippedQuestions.size > 0 ? 'Review Skipped' : 'Finish Quiz')
                      : 'Next Question'
                    )
                }
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      </motion.div>
        </>
      )}

      {/* Quit Quiz Confirmation Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={(open) => {
        setShowQuitDialog(open);
        // If dialog is being closed (user clicked Continue Quiz),
        // re-enter fullscreen if fullscreen mode is enabled
        if (!open && config.fullscreenMode && !document.fullscreenElement && quizContainerRef.current) {
          quizContainerRef.current.requestFullscreen().catch(() => {});
        }
      }}>
        <AlertDialogContent container={quizContainerRef.current}>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit this quiz? Your progress will be lost and the quiz will not be submitted.
              <br />
              <span className="font-medium mt-2 block">
                You've answered {Object.keys(answers).length} of {questions.length} questions so far.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Exit fullscreen before quitting
                exitFullscreen();
                // Clear saved progress
                try {
                  localStorage.removeItem(storageKey);
                  localStorage.removeItem('active-quiz-metadata');
                } catch (e) {
                  console.error("Failed to clear quiz progress", e);
                }
                onQuit?.();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Exit Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
