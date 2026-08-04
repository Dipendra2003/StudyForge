/**
 * QuizMode.tsx - AI-Powered Quiz System Main Page
 * 
 * This is the main entry point for the AI-Powered Quiz System, integrating all quiz features
 * including configuration, quiz-taking, results, analytics, leaderboards, and social features.
 * 
 * Key Features Integrated:
 * - Multiple question types (MCQ, True/False, Fill-blank, Matching, Rearrange) - Req 1
 * - Dynamic question loading from database and AI generation - Req 2
 * - Quiz configuration with filters - Req 3
 * - Timed and untimed quiz modes - Req 4
 * - Real-time feedback and scoring - Req 5
 * - Comprehensive results summary with animations - Req 6
 * - Global and filtered leaderboards - Req 7
 * - Performance analytics and progress tracking - Req 8
 * - Achievement badges and gamification - Req 9
 * - AI-powered hints and explanations - Req 10-14

 * - Quiz of the Day feature - Req 22
 * - Shareable quiz links - Req 23
 * - Save and favorite quizzes - Req 24
 * - Motivational quotes and feedback - Req 26
 * - Modern UI with glassmorphism and animations - Req 20-21
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LeaderboardDisplay } from "@/components/quiz/LeaderboardDisplay";
import { useIsMobile } from "@/hooks/use-mobile";
import QuizConfigurationPanel, { QuizConfig } from "@/components/quiz/QuizConfigurationPanel";
import QuizPlayer, { QuizResults } from "@/components/quiz/QuizPlayer";
import ResultsSummary from "@/components/quiz/ResultsSummary";
import QuizReviewMode from "@/components/quiz/QuizReviewMode";
import { QuizOfTheDay } from "@/components/quiz/QuizOfTheDay";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareQuizModal } from "@/components/quiz/ShareQuizModal";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { SavedFavoriteQuizzes } from "@/components/quiz/SavedFavoriteQuizzes";
import { Question } from "@/../../shared/quiz-types";
import QuizProgress from "@/components/quiz/QuizProgress";
import { AdaptiveDifficultyNotification } from "@/components/quiz/AdaptiveDifficultyNotification";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Main QuizMode Component
 * 
 * Manages the overall quiz experience including:
 * - Tab navigation between different quiz features
 * - Quiz lifecycle (configuration → taking → results)
 * - State management for quiz sessions
 * - Integration with backend services
 */
export default function QuizMode() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Navigation state - persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from sessionStorage on mount
    return sessionStorage.getItem('quizModeActiveTab') || "take-quiz";
  });
  
  // Load active quiz session from localStorage on mount if it exists
  const activeSession = (() => {
    try {
      const stored = localStorage.getItem('active-quiz-metadata');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  
  // Quiz lifecycle state
  const [isQuizStarted, setIsQuizStarted] = useState(activeSession ? true : false);
  const [showResults, setShowResults] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  
  // Quiz data state
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(activeSession ? activeSession.quizConfig : null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(activeSession ? activeSession.quizQuestions : []);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [questionAttempts, setQuestionAttempts] = useState<Record<number, any>>({});
  
  // Social features state
  const [showShareModal, setShowShareModal] = useState(false);
  const [completedQuizAttemptId, setCompletedQuizAttemptId] = useState<number | null>(null);
  
  // Session tracking - unique ID for hint tracking and progress (Req 13.2)
  const [sessionId, setSessionId] = useState<string>(() => 
    activeSession ? activeSession.sessionId : `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  );
  
  // QOTD tracking
  const [isQOTD, setIsQOTD] = useState(false);
  const [qotdId, setQotdId] = useState<string | null>(null);
  const [qotdAutoStarted, setQotdAutoStarted] = useState(false);
  
  // Custom query tracking
  const [queryAutoStarted, setQueryAutoStarted] = useState(false);
  
  // Hooks
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('quizModeActiveTab', activeTab);
  }, [activeTab]);
  
  // Parse URL parameters on mount to check for QOTD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qotdParam = params.get('qotd');
    if (qotdParam === 'true') {
      setIsQOTD(true);
      // Generate QOTD ID based on today's date
      const today = new Date().toISOString().split('T')[0];
      setQotdId(`qotd-${today}`);
    }
  }, []);
  
  // Adaptive difficulty notification state
  const [showAdaptiveNotification, setShowAdaptiveNotification] = useState(false);

  // ============================================================================
  // QUIZ QUESTION FETCHING
  // ============================================================================
  
  /**
   * Fetch questions based on configuration
   * Implements Requirement 2.1: Retrieve questions from database based on filters
   * Implements Requirement 2.4: Filter by difficulty
   * Implements Requirement 2.5: Filter by category
   * 
   * @param config - Quiz configuration with filters
   * @returns Array of questions matching the filters
   */
  const fetchQuestions = async (config: QuizConfig): Promise<Question[]> => {
    try {
      const params = new URLSearchParams({
        category: (config.category || config.topic || 'General Knowledge').toLowerCase(),
        difficulty: config.difficulty,
        types: config.questionTypes.join(','),
        limit: config.questionCount.toString(),
      });
      
      // Add AI mode and topic if specified
      if (config.aiMode) {
        params.append('aiMode', 'true');
        if (config.topic) {
          params.append('topic', config.topic);
        }
      }
      
      // Show loading toast for AI mode
      if (config.aiMode) {
        toast({
          title: "Generating Questions",
          description: `Creating ${config.questionCount} AI-powered questions. This may take a moment...`,
        });
      }
      
      const response = await apiRequest<{ questions: Question[] }>(`/api/questions?${params}`);
      return response.questions || [];
    } catch (error: any) {
      
      // Handle AI-specific errors with detailed messages
      if (error?.code) {
        // AI error with specific code
        const errorMessages: Record<string, { title: string; description: string }> = {
          'API_TIMEOUT': {
            title: 'AI Generation Timeout',
            description: 'AI question generation timed out. Please try with fewer questions or use database questions.',
          },
          'RATE_LIMIT': {
            title: 'Rate Limit Reached',
            description: 'AI service rate limit reached. Please wait a moment and try again, or use database questions.',
          },
          'API_KEY_ERROR': {
            title: 'AI Service Error',
            description: 'AI service configuration error. Please use database questions or contact support.',
          },
          'NETWORK_ERROR': {
            title: 'Connection Issue',
            description: 'Network connection issue. Please check your internet and try again, or use database questions.',
          },
          'INVALID_RESPONSE': {
            title: 'AI Response Error',
            description: 'AI generated an invalid response. Please try again or use database questions.',
          },
          'GENERATION_FAILED': {
            title: 'Generation Failed',
            description: 'AI question generation failed. Please try again or use database questions.',
          },
          'UNKNOWN_ERROR': {
            title: 'AI Unavailable',
            description: 'AI question generation unavailable. Please try again or use database questions.',
          },
        };
        
        const errorInfo = errorMessages[error.code] || {
          title: 'AI Unavailable',
          description: error.message || 'AI question generation unavailable. Please try again or use database questions.',
        };
        
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
          variant: "destructive",
        });
      } else {
        // Generic error
        toast({
          title: "Error loading questions",
          description: error.message || "Failed to load quiz questions. Please try again.",
          variant: "destructive",
        });
      }
      
      return [];
    }
  };

  // ============================================================================
  // QUIZ LIFECYCLE HANDLERS
  // ============================================================================
  
  // Loading state for quiz generation
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  /**
   * Start quiz with configuration
   * Implements Requirement 2.3: Shuffle questions randomly
   * Implements Requirement 3.4: Handle no questions available scenario
   * Implements Requirement 28.2: Don't show false errors in AI mode
   * 
   * @param config - Quiz configuration from QuizConfigurationPanel
   */
  const handleStartQuiz = async (config: QuizConfig) => {
    setIsLoadingQuiz(true);
    
    try {
      const questions = await fetchQuestions(config);
      
      // Requirement 28.2: Only show "No questions available" if API actually returned empty
      // The fetchQuestions function already handles errors and shows appropriate messages
      // If we get here with 0 questions, it means the API succeeded but returned nothing
      if (questions.length === 0) {
        // This should only happen in database mode when no questions match filters
        // In AI mode, errors are handled in fetchQuestions with specific messages
        if (!config.aiMode) {
          toast({
            title: "No questions available",
            description: "No questions match your selected criteria. Please try different settings or enable AI mode.",
            variant: "destructive",
          });
        }
        return;
      }

      // Requirement 2.3: Shuffle questions for random order each attempt
      const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

      // Generate a brand new unique session ID for every fresh quiz attempt
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      setSessionId(newSessionId);

      // Purge any stale progress from localStorage before initializing
      try {
        localStorage.removeItem('active-quiz-metadata');
        localStorage.removeItem(`quiz-progress-${sessionId}`);
        localStorage.removeItem(`quiz-progress-${newSessionId}`);
        if (shuffledQuestions[0]) {
          localStorage.removeItem(`quiz-progress-${shuffledQuestions[0].id}-${shuffledQuestions.length}`);
        }
      } catch (e) {
        console.error("Failed to clear previous session progress", e);
      }
      
      // Initialize quiz state
      setQuizConfig({ ...config, sessionId: newSessionId });
      setQuizQuestions(shuffledQuestions);
      setIsQuizStarted(true);
      setShowResults(false);
      setQuizResults(null);
      
      // Save active session to localStorage to survive page refreshes
      try {
        localStorage.setItem('active-quiz-metadata', JSON.stringify({
          quizConfig: { ...config, sessionId: newSessionId },
          quizQuestions: shuffledQuestions,
          sessionId: newSessionId
        }));
      } catch (e) {
        console.error("Failed to save active quiz session", e);
      }
      
      toast({
        title: "Quiz Started!",
        description: `Get ready for ${shuffledQuestions.length} questions. Good luck!`,
      });
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Auto-start QOTD quiz when parameters are present (only on first load)
  useEffect(() => {
    if (isQOTD && !isQuizStarted && !qotdAutoStarted && !showResults) {
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category') || 'Tech';
      const difficulty = params.get('difficulty') || 'hard';
      const count = parseInt(params.get('count') || '10');
      
      // Switch to take-quiz tab
      setActiveTab('take-quiz');
      
      // Create QOTD config and auto-start
      const qotdConfig: QuizConfig = {
        category,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        questionCount: count,
        questionTypes: ['mcq'], // QOTD uses MCQ only
        timedMode: false,
        aiMode: true,
        sessionId,
      };
      
      // Mark as auto-started to prevent re-triggering
      setQotdAutoStarted(true);
      
      // Auto-start the quiz
      handleStartQuiz(qotdConfig);
    }
  }, [isQOTD, isQuizStarted, qotdAutoStarted, showResults, sessionId, handleStartQuiz]);

  // Auto-start custom topic quiz when 'q' parameter is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTopic = params.get('q');
    
    if (queryTopic && !isQuizStarted && !queryAutoStarted && !showResults) {
      // Switch to take-quiz tab
      setActiveTab('take-quiz');
      
      // Create config and auto-start
      const aiConfig: QuizConfig = {
        category: 'Custom',
        difficulty: 'medium',
        questionCount: 10,
        questionTypes: ['mcq'], // Default to MCQ for AI generated
        timedMode: false,
        aiMode: true,
        topic: queryTopic,
        sessionId,
      };
      
      // Mark as auto-started to prevent re-triggering
      setQueryAutoStarted(true);
      
      // Remove 'q' parameter from URL to prevent auto-restart on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Auto-start the quiz
      handleStartQuiz(aiConfig);
    }
  }, [isQuizStarted, queryAutoStarted, showResults, sessionId, handleStartQuiz]);

  // ============================================================================
  // DATA PERSISTENCE
  // ============================================================================
  
  /**
   * Save quiz attempt to database
   * Implements Requirement 8.6: Store quiz completion stats
   * Implements Requirement 18.4: Associate data with authenticated user
   * Implements Requirement 19.2: Record quiz attempt data
   */
  const saveQuizAttemptMutation = useMutation({
    mutationFn: async (attemptData: {
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      timeSpent: number;
      category: string;
      difficulty: string;
      hintsUsed?: number;
    }) => {
      return apiRequest('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attemptData),
      });
    },
    onSuccess: (data: any) => {
      // Store attempt ID for sharing functionality (Req 23.1)
      if (data?.id) {
        setCompletedQuizAttemptId(data.id);
      }
    },
    onError: (error) => {
      // Requirement 19.5: Handle database errors gracefully
      toast({
        title: "Warning",
        description: "Quiz completed but failed to save. Your progress may not be recorded.",
        variant: "destructive",
      });
    },
  });

  /**
   * Handle quiz completion
   * Implements Requirement 6: Display results summary
   * Implements Requirement 6.5: Show confetti for high scores
   * Implements Requirement 9: Award badges based on performance
   * Implements Requirement 12.3: Show adaptive difficulty notification
   */
  const handleQuizComplete = async (results: QuizResults) => {
    setQuizResults(results);
    setUserAnswers(results.userAnswers || {});
    setQuestionAttempts(results.questionAttempts || {});
    setShowResults(true);
    setIsQuizStarted(false);
    setShowReviewMode(false);
    
    // Clear active session from localStorage
    try {
      localStorage.removeItem('active-quiz-metadata');
    } catch (e) {
      console.error("Failed to clear active quiz session", e);
    }
    
    // Requirement 8.6 & 19.2: Save quiz attempt to database
    if (quizConfig) {
      try {
        // Prepare question attempts data
        const questionAttemptsData = Object.entries(results.questionAttempts || {}).map(([qId, attempt]: [string, any]) => ({
          questionId: parseInt(qId),
          userAnswer: attempt.userAnswer,
          isCorrect: attempt.isCorrect,
          timeSpent: attempt.timeSpent || 0,
        }));

        const response = await apiRequest<{ id: number; newAchievements?: any[]; success?: boolean; message?: string }>('/api/quiz-attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            score: results.score,
            totalQuestions: results.totalQuestions,
            correctAnswers: results.correctAnswers,
            incorrectAnswers: results.incorrectAnswers,
            timeSpent: results.timeSpent,
            category: quizConfig.category,
            difficulty: quizConfig.difficulty,
            hintsUsed: results.hintsUsed,
            questionsData: quizQuestions, // Include full questions for review
            questionAttempts: questionAttemptsData, // Include individual question attempts
          }),
        });
        
        // Store attempt ID for sharing functionality
        if (response?.id) {
          setCompletedQuizAttemptId(response.id);
        }
        
        // Update results with achievements from backend
        if (response?.newAchievements && response.newAchievements.length > 0) {
          setQuizResults({
            ...results,
            newAchievements: response.newAchievements,
          });
        }
        
        // If this is a Quiz of the Day, award bonus points
        if (isQOTD && qotdId) {
          try {
            const qotdResponse = await apiRequest<{ bonusPoints: number; newAchievements?: any[]; message?: string }>('/api/quiz-of-the-day/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                quizId: qotdId,
                score: results.score,
                totalQuestions: results.totalQuestions,
                correctAnswers: results.correctAnswers,
                incorrectAnswers: results.incorrectAnswers,
                timeSpent: results.timeSpent,
                accuracy: results.accuracy,
                category: quizConfig.category,
                difficulty: quizConfig.difficulty,
              }),
            });
            

            
            // Show bonus points notification
            if (qotdResponse?.bonusPoints) {
              toast({
                title: "🎁 Quiz of the Day Bonus!",
                description: `You earned ${qotdResponse.bonusPoints} bonus points!`,
                duration: 3000,
              });
              
              // Update results with bonus points
              setQuizResults(prev => prev ? {
                ...prev,
                bonusPoints: qotdResponse.bonusPoints,
                newAchievements: [
                  ...(prev.newAchievements || []),
                  ...(qotdResponse.newAchievements || [])
                ],
              } : null);
            }
          } catch (qotdError: any) {
            console.error('Failed to complete QOTD:', qotdError);
            
            // If already completed today, show info message instead of error
            if (qotdError?.message?.includes('already completed') || qotdError?.status === 400) {
              // Don't show error for retry attempts
            } else {
              // Show error for other issues
              console.error('QOTD completion error:', qotdError);
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to save quiz attempt:', error);
        
        // Provide more detailed error message
        let errorMessage = "Quiz completed but failed to save. Your progress may not be recorded.";
        if (error?.message) {
          console.error('Error details:', error.message);
          errorMessage = `Failed to save: ${error.message}`;
        }
        if (error?.response) {
          console.error('Server response:', error.response);
        }
        
        toast({
          title: "Warning",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    
    // Requirement 6.5: Show confetti animation for high scores (>90%)
    if (results.score > 90) {
      toast({
        title: "🎉 Outstanding Performance!",
        description: `You scored ${results.score}%! Excellent work!`,
      });
    }
    
    // Requirement 12.3: Trigger adaptive difficulty notification check
    // Show notification after a brief delay to let results animation complete
    setTimeout(() => {
      setShowAdaptiveNotification(true);
    }, 1500);
  };

  /**
   * Handle retry quiz
   * Implements Requirement 6.6: Retry option
   */
  const handleRetryQuiz = () => {
    if (quizConfig) {
      // If this is a QOTD retry, clear the QOTD flag to allow normal quiz flow
      // This prevents auto-completion tracking for retry attempts
      if (isQOTD) {
        setIsQOTD(false);
        setQotdId(null);
        
        // Remove qotd parameter from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('qotd');
        window.history.replaceState({}, '', url.toString());
      }
      
      // Reset to configuration screen instead of auto-starting
      // This allows users to change parameters for different questions
      setShowResults(false);
      setIsQuizStarted(false);
      setQuizResults(null);
      setQuizQuestions([]);
      setUserAnswers({});
      setQuestionAttempts({});
      
      // Clear active session from localStorage
      try {
        localStorage.removeItem('active-quiz-metadata');
        if (quizConfig.sessionId) {
          localStorage.removeItem(`quiz-progress-${quizConfig.sessionId}`);
        }
      } catch (e) {
        console.error("Failed to clear active quiz session", e);
      }
      
      toast({
        title: "Ready for a new quiz!",
        description: "Configure your quiz settings or start with the same settings.",
      });
    }
  };

  /**
   * Handle quit quiz
   * Allows user to exit the quiz before completing with a confirmation dialog
   */
  const handleQuitQuiz = () => {
    // Clear active session from localStorage
    try {
      localStorage.removeItem('active-quiz-metadata');
      if (quizConfig?.sessionId) {
        localStorage.removeItem(`quiz-progress-${quizConfig.sessionId}`);
      }
      if (quizQuestions[0]) {
        localStorage.removeItem(`quiz-progress-${quizQuestions[0].id}-${quizQuestions.length}`);
      }
    } catch (e) {
      console.error("Failed to clear active quiz session", e);
    }

    // Reset all quiz state back to configuration screen
    setShowResults(false);
    setIsQuizStarted(false);
    setQuizResults(null);
    setQuizQuestions([]);
    setUserAnswers({});
    setQuestionAttempts({});
    
    // Clear QOTD state if applicable
    if (isQOTD) {
      setIsQOTD(false);
      setQotdId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('qotd');
      window.history.replaceState({}, '', url.toString());
    }
    
    toast({
      title: "Quiz Exited",
      description: "You have exited the quiz. You can start a new one anytime.",
    });
  };

  /**
   * Handle view answers
   * Implements Requirement 6.6: View detailed answers option
   */
  const handleViewAnswers = () => {
    if (quizQuestions.length > 0) {
      setShowResults(false);
      setShowReviewMode(true);
      toast({
        title: "Review Mode",
        description: "Review all questions with correct answers and explanations.",
      });
    } else {
      toast({
        title: "No questions to review",
        description: "Quiz questions are no longer available.",
        variant: "destructive",
      });
    }
  };

  /**
   * Handle share results
   * Implements Requirement 23: Shareable quiz links
   */
  const handleShareResults = () => {
    if (!quizResults) {
      toast({
        title: "No results to share",
        description: "Please complete a quiz first.",
        variant: "destructive",
      });
      return;
    }

    if (completedQuizAttemptId) {
      setShowShareModal(true);
    } else {
      toast({
        title: "Generating share link...",
        description: "Please wait while we prepare your results for sharing.",
      });
      
      // Retry saving the quiz attempt if it failed earlier
      if (quizConfig) {
        apiRequest<{ id: number }>('/api/quiz-attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            score: quizResults.score,
            totalQuestions: quizResults.totalQuestions,
            correctAnswers: quizResults.correctAnswers,
            incorrectAnswers: quizResults.incorrectAnswers,
            timeSpent: quizResults.timeSpent,
            category: quizConfig.category,
            difficulty: quizConfig.difficulty,
            hintsUsed: quizResults.hintsUsed,
          }),
        })
          .then((response) => {
            if (response?.id) {
              setCompletedQuizAttemptId(response.id);
              setShowShareModal(true);
              toast({
                title: "Ready to share!",
                description: "Your quiz results are ready to be shared.",
              });
            } else {
              throw new Error('No attempt ID returned');
            }
          })
          .catch((error) => {
            console.error('Failed to save quiz attempt:', error);
            toast({
              title: "Share unavailable",
              description: "Unable to generate share link. Please try again later.",
              variant: "destructive",
            });
          });
      } else {
        toast({
          title: "Share unavailable",
          description: "Quiz configuration not found. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  /**
   * Handle hint request
   * Implements Requirement 13: AI hint system
   */
  const handleHintRequest = async (questionId: number): Promise<string> => {
    try {
      const response = await apiRequest<{ hint: string }>(`/api/questions/${questionId}/hint`, {
        method: 'POST',
      });
      return response.hint || "No hint available for this question.";
    } catch (error) {
      return "Unable to load hint at this time.";
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
        {/* 
          Header with animated intro
          Implements Requirement 21.1: Animated intro sequence
        */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 md:mb-8"
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                </motion.div>
                AI-Powered Quiz Mode
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Test your knowledge with intelligent, adaptive quizzes powered by AI
              </p>
            </div>
            

          </div>
        </motion.div>

        {/*
          Main Tab Navigation
          Implements Requirements 7, 8, 22, 24: Multiple quiz features
        */}
        <Tabs defaultValue="take-quiz" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-4' : 'grid-cols-5'} gap-1 mb-6`}>
            <TabsTrigger value="take-quiz" className="text-xs md:text-sm gap-1 md:gap-2">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              {isMobile ? 'Quiz' : 'Take Quiz'}
            </TabsTrigger>
            <TabsTrigger value="quiz-of-day" className="text-xs md:text-sm gap-1 md:gap-2">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              {isMobile ? 'Daily' : 'Daily Quiz'}
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-xs md:text-sm gap-1 md:gap-2">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              {isMobile ? 'Saved' : 'My Quizzes'}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="progress" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Leaderboard
                </TabsTrigger>
              </>
            )}
            {isMobile && (
              <TabsTrigger value="more" className="text-xs md:text-sm">More</TabsTrigger>
            )}
          </TabsList>
          
          {/* 
            Take Quiz Tab - Main quiz interface
            Implements Requirements 1-6: Core quiz functionality
          */}
          <TabsContent value="take-quiz" className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Quiz Configuration Phase */}
              {!isQuizStarted && !showResults && !showReviewMode && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <QuizConfigurationPanel
                    onStartQuiz={handleStartQuiz}
                    isLoading={isLoadingQuiz}
                    disabled={isLoadingQuiz}
                  />
                </motion.div>
              )}

              {/* Quiz Taking Phase */}
              {isQuizStarted && quizConfig && quizQuestions.length > 0 && !showReviewMode && (
                <motion.div
                  key="player"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <QuizPlayer
                    questions={quizQuestions}
                    config={quizConfig}
                    onComplete={handleQuizComplete}
                    onHintRequest={handleHintRequest}
                    onQuit={handleQuitQuiz}
                  />
                </motion.div>
              )}

              {/* Results Phase */}
              {showResults && quizResults && !showReviewMode && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <ResultsSummary
                    results={quizResults}
                    onViewAnswers={handleViewAnswers}
                    onShare={handleShareResults}
                    onRetry={handleRetryQuiz}
                  />
                </motion.div>
              )}

              {/* Review Mode Phase */}
              {showReviewMode && quizQuestions.length > 0 && userAnswers && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <QuizReviewMode
                    questions={quizQuestions}
                    userAnswers={userAnswers}
                    questionAttempts={questionAttempts}
                    onBack={() => {
                      setShowReviewMode(false);
                      setShowResults(true);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* 
            Quiz of the Day Tab
            Implements Requirement 22: Daily featured quiz
          */}
          <TabsContent value="quiz-of-day">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <QuizOfTheDay />
            </motion.div>
          </TabsContent>
          
          {/* 
            Saved & Favorite Quizzes Tab
            Implements Requirement 24: Save and favorite functionality
          */}
          <TabsContent value="saved">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SavedFavoriteQuizzes 
                onStartQuiz={(config) => {
                  setActiveTab("take-quiz");
                  handleStartQuiz(config);
                }}
              />
            </motion.div>
          </TabsContent>
          
          {/* 
            Progress & Analytics Tab
            Implements Requirement 8: Performance tracking and analytics
          */}
          <TabsContent value="progress">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <QuizProgress />
            </motion.div>
          </TabsContent>
          
          {/* 
            Leaderboard Tab
            Implements Requirement 7: Global and filtered leaderboards
          */}
          <TabsContent value="leaderboard">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <LeaderboardDisplay />
            </motion.div>
          </TabsContent>
          
          {/* 
            Mobile More Options Tab
            Provides access to Progress and Leaderboard on mobile devices
          */}
          {isMobile && (
            <TabsContent value="more">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      More Options
                    </CardTitle>
                    <CardDescription>Access additional quiz features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-base gap-3 hover:bg-primary/5 transition-colors"
                      onClick={() => setActiveTab("progress")}
                    >
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold">Progress & Analytics</div>
                        <div className="text-xs text-muted-foreground">View your performance stats</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-base gap-3 hover:bg-primary/5 transition-colors"
                      onClick={() => setActiveTab("leaderboard")}
                    >
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold">Leaderboard</div>
                        <div className="text-xs text-muted-foreground">See top performers</div>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          )}
        </Tabs>

        {/* 
          Floating Action Hints
          Provides contextual tips during quiz taking
          Only shown when quiz is active
        */}

      </div>

      {/* 
        Share Quiz Modal
        Implements Requirement 23: Shareable quiz links
        Allows users to share their quiz results with friends
      */}
      {completedQuizAttemptId && quizResults && (
        <ShareQuizModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          quizAttemptId={completedQuizAttemptId}
          score={quizResults.correctAnswers}
          totalQuestions={quizResults.totalQuestions}
        />
      )}

      {/* 
        Adaptive Difficulty Notification
        Implements Requirement 12.3: Notify user of difficulty changes
        Shows after quiz completion if difficulty should be adjusted
      */}
      {showAdaptiveNotification && user && (
        <AdaptiveDifficultyNotification
          userId={user.id}
          onDismiss={() => setShowAdaptiveNotification(false)}
          autoFetch={true}
        />
      )}
    </DashboardLayout>
  );
}
