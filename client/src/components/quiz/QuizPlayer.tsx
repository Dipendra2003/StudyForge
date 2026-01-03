import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
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
import { generateMotivation } from "@/lib/api";
import { useTTSReader } from "./TTSReader";
import { getRandomMotivationalQuote } from "@/lib/motivationalQuotes";
import { useIsMobile } from "@/hooks/use-mobile";
import { VoiceController } from "./VoiceController";

export interface QuizResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  accuracy: number;
  badge?: 'gold' | 'silver' | 'bronze';
  newAchievements: Achievement[];
  performanceByCategory: Record<string, number>;
  hintsUsed?: number;
  questionsWithHints?: number[];
  motivationalQuote?: {
    text: string;
    author?: string;
  };
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
}

interface QuestionAttempt {
  questionId: number;
  userAnswer: string | string[] | Record<string, string>;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
}

export default function QuizPlayer({
  questions,
  config,
  onComplete,
  onHintRequest,
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAttempt>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[] | Record<string, string> | null>(null);
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
  const [motivationType, setMotivationType] = useState<'success' | 'support' | 'periodic'>('success');
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Store correct answers after submission (received from backend)
  const [revealedCorrectAnswers, setRevealedCorrectAnswers] = useState<Record<number, string | string[] | Record<string, string>>>({});
  
  // Use ref to track the latest answer value synchronously (fixes race condition)
  const currentAnswerRef = useRef<string | string[] | Record<string, string> | null>(null);
  
  // Hint tracking
  const { 
    totalHintsUsed, 
    trackHintUsage, 
    getHintUsageForQuestion,
    getQuestionsWithHints 
  } = useHintTracking();

  // Text-to-speech
  const ttsReader = useTTSReader();

  // Mobile detection
  const isMobile = useIsMobile();

  // Swipe gesture state
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Voice input state
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [showVoiceConfirmation, setShowVoiceConfirmation] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

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
  }, [config.timedMode, config.timeLimit, currentQuestionIndex, currentAnswer, answers, questions, correctCount, incorrectCount]);

  // Reset answer state when question changes
  useEffect(() => {
    setCurrentAnswer(null);
    currentAnswerRef.current = null;
    setHasSubmitted(false);
    setShowFeedbackAnimation(false);
    setShowMotivation(false); // Hide motivation when moving to next question
    setQuestionStartTime(Date.now());

    // Read question aloud if voice mode is enabled
    if (config.voiceMode && currentQuestion && ttsReader.isSupported) {
      // Stop any ongoing speech (audio interruption on navigation - Requirement 16.5)
      ttsReader.stop();
      
      // Read the new question with options (Requirements 16.1, 16.2)
      setTimeout(() => {
        ttsReader.readQuestion(currentQuestion);
      }, 300); // Small delay for smooth transition
    }

    // Show periodic encouragement every 5 questions (but not on first question)
    if (currentQuestionIndex > 0 && currentQuestionIndex % 5 === 0) {
      fetchPeriodicEncouragement();
    }
  }, [currentQuestionIndex, config.voiceMode, currentQuestion, ttsReader]);

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

      // Read periodic encouragement aloud if voice mode is enabled (Requirement 14.4)
      if (config.voiceMode && ttsReader.isSupported) {
        ttsReader.readMotivation(motivation);
      }

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

  /**
   * Handle voice input for answer submission
   * Requirements: 15.2, 15.3
   * Maps voice transcript to appropriate answer format based on question type
   */
  const handleVoiceInput = useCallback((transcript: string) => {
    if (hasSubmitted) return;

    const cleanTranscript = transcript.trim().toLowerCase();
    setVoiceTranscript(transcript);
    setShowVoiceConfirmation(true);

    // Map voice input based on question type
    if (currentQuestion.type === 'mcq' && isMCQData(currentQuestion.questionData)) {
      const data = currentQuestion.questionData as MCQData;
      
      // Try to match transcript to option text or letter (a, b, c, d)
      const matchedOption = data.options.find(opt => {
        const optionText = opt.text.toLowerCase();
        const optionLetter = opt.id.toLowerCase();
        
        // Match by letter (e.g., "a", "option a", "answer a")
        if (cleanTranscript.includes(optionLetter) && cleanTranscript.length <= 10) {
          return true;
        }
        
        // Match by option text (fuzzy match - contains key words)
        const transcriptWords = cleanTranscript.split(' ');
        const optionWords = optionText.split(' ');
        const matchCount = transcriptWords.filter(word => 
          optionWords.some(optWord => optWord.includes(word) || word.includes(optWord))
        ).length;
        
        return matchCount >= Math.min(2, optionWords.length);
      });

      if (matchedOption) {
        setCurrentAnswer(matchedOption.id);
        currentAnswerRef.current = matchedOption.id;
      }
    } else if (currentQuestion.type === 'true-false') {
      // Match "true" or "false" in transcript
      if (cleanTranscript.includes('true') || cleanTranscript.includes('yes')) {
        setCurrentAnswer('true');
        currentAnswerRef.current = 'true';
      } else if (cleanTranscript.includes('false') || cleanTranscript.includes('no')) {
        setCurrentAnswer('false');
        currentAnswerRef.current = 'false';
      }
    } else if (currentQuestion.type === 'fill-blank' && isFillBlankData(currentQuestion.questionData)) {
      const data = currentQuestion.questionData as FillBlankData;
      
      // For fill-in-blank, use transcript directly as answer
      // If multiple blanks, split by common separators
      if (data.blanks.length === 1) {
        const answer = [transcript];
        setCurrentAnswer(answer);
        currentAnswerRef.current = answer;
      } else {
        // Try to split by "and", "comma", or "next"
        const answers = transcript
          .split(/\s+and\s+|\s*,\s*|\s+next\s+/i)
          .map(ans => ans.trim())
          .slice(0, data.blanks.length);
        
        setCurrentAnswer(answers);
        currentAnswerRef.current = answers;
      }
    }

    // Hide confirmation after 3 seconds
    setTimeout(() => setShowVoiceConfirmation(false), 3000);
  }, [currentQuestion, hasSubmitted]);

  /**
   * Handle voice input end
   * Requirement: 15.5
   */
  const handleVoiceSpeechEnd = useCallback(() => {
    // Voice input session ended
  }, []);

  // Check if answer is correct
  const checkAnswer = useCallback((
    question: Question,
    userAnswer: string | string[] | Record<string, string>
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
        ans.trim().toLowerCase() === correctAnswer[idx].trim().toLowerCase()
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
  const submitAnswerToBackend = async (questionId: number, userAnswer: string | string[] | Record<string, string>): Promise<{ isCorrect: boolean; correctAnswer: any }> => {
    try {
      const response = await fetch('/api/quiz/validate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          userAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate answer');
      }

      const data = await response.json();
      return {
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
      };
    } catch (error) {
      // Fallback to client-side validation if backend fails
      return {
        isCorrect: checkAnswer(currentQuestion, userAnswer),
        correctAnswer: currentQuestion.correctAnswer, // Fallback only
      };
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    // Use ref value which is always up-to-date (no async state issues)
    const answerToSubmit = currentAnswerRef.current;
    console.log('=== SUBMIT DEBUG ===');
    console.log('currentAnswer (state):', currentAnswer);
    console.log('currentAnswerRef.current (ref):', currentAnswerRef.current);
    console.log('answerToSubmit:', answerToSubmit);
    console.log('hasSubmitted:', hasSubmitted);
    console.log('===================');
    
    // Prevent double submission
    if (hasSubmitted) {
      console.log('Already submitted, returning');
      return;
    }
    
    // Validate we have an answer - use ref value which is synchronously updated
    if (answerToSubmit === null || answerToSubmit === undefined) {
      console.log('❌ VALIDATION FAILED - answerToSubmit is null/undefined');
      alert('Please select an answer before submitting');
      return;
    }
    
    console.log('✅ VALIDATION PASSED - Proceeding with submission');
    
    // Check for empty arrays
    if (Array.isArray(answerToSubmit) && answerToSubmit.length === 0) {
      alert('Please select an answer before submitting');
      return;
    }
    
    // Check for empty strings
    if (typeof answerToSubmit === 'string' && answerToSubmit.trim() === '') {
      alert('Please select an answer before submitting');
      return;
    }
    
    // Check for empty objects (matching questions)
    if (typeof answerToSubmit === 'object' && !Array.isArray(answerToSubmit) && Object.keys(answerToSubmit).length === 0) {
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

    // Read explanation aloud if voice mode is enabled (Requirement 16.3)
    if (config.voiceMode && currentQuestion.explanation && ttsReader.isSupported) {
      setTimeout(() => {
        ttsReader.readExplanation(currentQuestion.explanation);
      }, 1000); // Delay to let feedback animation complete
    }

    // Generate motivational feedback
    fetchMotivationalFeedback(isCorrect);
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

      // Read motivational message aloud if voice mode is enabled (Requirement 14.4)
      if (config.voiceMode && ttsReader.isSupported) {
        setTimeout(() => {
          ttsReader.readMotivation(motivation);
        }, 500);
      }

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

      // Read fallback message aloud if voice mode is enabled
      if (config.voiceMode && ttsReader.isSupported) {
        setTimeout(() => {
          ttsReader.readMotivation(fallbackMessage);
        }, 500);
      }

      setTimeout(() => setShowMotivation(false), 5000);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (isLastQuestion) {
      handleQuizComplete();
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

      // Calculate final counts
      const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
      const finalIncorrectCount = isCorrect ? incorrectCount : incorrectCount + 1;

      // Complete quiz with updated data
      completeQuizWithData(updatedAnswers, finalCorrectCount, finalIncorrectCount);
    } else {
      // No current answer, just complete with existing data
      completeQuizWithData(answers, correctCount, incorrectCount);
    }
  }, [currentAnswer, hasSubmitted, currentQuestion, questionStartTime, answers, correctCount, incorrectCount, checkAnswer]);

  // Complete quiz and calculate results
  const completeQuizWithData = (
    finalAnswers: Record<number, QuestionAttempt>,
    finalCorrectCount: number,
    finalIncorrectCount: number
  ) => {
    const totalQuestions = questions.length;
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
    };

    onComplete(results);
  };

  // Handle quiz completion (called when user clicks finish)
  const handleQuizComplete = () => {
    completeQuizWithData(answers, correctCount, incorrectCount);
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
        value={userAnswer || undefined}
        onValueChange={(value) => {
          console.log('=== RADIO CHANGE DEBUG ===');
          console.log('Selected value:', value);
          console.log('hasSubmitted:', hasSubmitted);
          console.log('Before - currentAnswer:', currentAnswer);
          console.log('Before - currentAnswerRef.current:', currentAnswerRef.current);
          if (!hasSubmitted) {
            setCurrentAnswer(value);
            currentAnswerRef.current = value; // Update ref synchronously
            console.log('After - currentAnswer (state set, may not be updated yet):', value);
            console.log('After - currentAnswerRef.current:', currentAnswerRef.current);
            console.log('✅ Answer updated successfully');
          } else {
            console.log('⚠️ Skipped update - already submitted');
          }
          console.log('========================');
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
              className={optionClassName}
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
        <p className="text-base md:text-lg">{data.statement}</p>
        <RadioGroup
          value={userAnswer}
          onValueChange={(value) => {
            if (!hasSubmitted) {
              setCurrentAnswer(value);
              currentAnswerRef.current = value; // Update ref synchronously
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
                className={optionClassName}
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
        <p className="text-lg whitespace-pre-wrap">{data.template}</p>
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

  // Render Matching (simplified version)
  const renderMatching = (question: Question) => {
    if (!isMatchingData(question.questionData)) return null;
    const data = question.questionData as MatchingData;

    return (
      <div className="space-y-4">
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Matching questions are not yet fully implemented in this version.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Left Column</h4>
            {data.leftColumn.map(item => (
              <div key={item.id} className="p-3 border rounded-md">
                {item.text}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Right Column</h4>
            {data.rightColumn.map(item => (
              <div key={item.id} className="p-3 border rounded-md">
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Rearrange (simplified version)
  const renderRearrange = (question: Question) => {
    if (!isRearrangeData(question.questionData)) return null;
    const data = question.questionData as RearrangeData;

    return (
      <div className="space-y-4">
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Rearrange questions are not yet fully implemented in this version.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          {data.items.map((item, index) => (
            <div key={index} className="p-3 border rounded-md">
              {item}
            </div>
          ))}
        </div>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 relative"
    >
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
              <CardTitle className="text-lg md:text-xl">
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardTitle>
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

          {/* TTS Audio Controls - Requirement 16.4 */}
          {config.voiceMode && ttsReader.isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {ttsReader.isPaused ? 'Audio Paused' : 'Reading Aloud...'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={ttsReader.isPaused ? ttsReader.resume : ttsReader.pause}
                  className="h-8"
                >
                  {ttsReader.isPaused ? (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={ttsReader.skip}
                  className="h-8"
                >
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={ttsReader.stop}
                  className="h-8"
                >
                  <VolumeX className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
            </motion.div>
          )}

          {/* Voice Input Controller - Requirements 15.1, 15.2, 15.3, 15.4, 15.5 */}
          {config.voiceMode && !hasSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <VoiceController
                enabled={config.voiceMode}
                onVoiceInput={handleVoiceInput}
                onSpeechEnd={handleVoiceSpeechEnd}
                showTTSControls={false}
              />
              
              {/* Voice Transcript Confirmation - Requirement 15.3 */}
              <AnimatePresence>
                {showVoiceConfirmation && voiceTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Voice input received:
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          "{voiceTranscript}"
                        </p>
                        {currentAnswer && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                            ✓ Answer set. Click Submit when ready.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 px-4 md:px-6 py-4 mt-auto border-t bg-card/50 backdrop-blur-sm sticky bottom-0 z-20">
          <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {correctCount} Correct
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm">
              <XCircle className="h-3 w-3 text-red-600" />
              {incorrectCount} Incorrect
            </Badge>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {!hasSubmitted ? (
              <Button
                onClick={handleSubmitAnswer}
                size="lg"
                className="w-full md:w-auto h-12 md:h-10 text-base md:text-sm touch-manipulation font-semibold"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion} 
                size="lg"
                className="w-full md:w-auto h-12 md:h-10 text-base md:text-sm touch-manipulation"
              >
                {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      </motion.div>
    </motion.div>
  );
}
