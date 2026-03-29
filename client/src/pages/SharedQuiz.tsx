import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Trophy, Users, ArrowLeft } from "lucide-react";
import QuizPlayer from "@/components/quiz/QuizPlayer";
import { SharedQuizComparison } from "@/components/quiz/SharedQuizComparison";
import type { Question } from "@/../../shared/quiz-types";

interface SharedQuizData {
  id: number;
  linkId: string;
  creatorUserId: number;
  creatorUsername: string;
  category: string;
  difficulty: string;
  questionsData: any;
  totalQuestions: number;
  createdAt: Date;
  creatorScore: number;
  creatorTimeSpent: number;
}

export default function SharedQuiz() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/quiz/shared/:linkId");
  
  // Safely extract linkId with proper null checking
  const linkId = params?.linkId || '';
  
  console.log('SharedQuiz - linkId:', linkId, 'params:', params);
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [, setQuizAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Fetch shared quiz details
  const { data, isLoading, error } = useQuery<{ data: SharedQuizData }>({
    queryKey: ["shared-quiz", linkId],
    queryFn: async () => {
      const response = await fetch(`/api/quiz/share/${linkId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch shared quiz");
      }

      return response.json();
    },
    enabled: !!linkId,
  });

  // Load questions when quiz data is available
  useEffect(() => {
    if (!data?.data) return; // Exit early if no data
    
    console.log('SharedQuiz - Loading questions, raw questionsData:', data.data.questionsData);
    
    // Parse questionsData if it's a string
    let parsedQuestionsData = data.data.questionsData;
    if (typeof parsedQuestionsData === 'string') {
      try {
        parsedQuestionsData = JSON.parse(parsedQuestionsData);
        console.log('SharedQuiz - Parsed questionsData:', parsedQuestionsData);
      } catch (e) {
        console.error("Failed to parse questionsData:", e);
        parsedQuestionsData = [];
      }
    }
    
    if (Array.isArray(parsedQuestionsData) && parsedQuestionsData.length > 0) {
      // Extract question IDs from questionsData
      const questionIds = parsedQuestionsData.map((q: any) => q.questionId || q.id).filter(Boolean);
      console.log('SharedQuiz - Extracted question IDs:', questionIds);
      
      if (questionIds.length === 0) {
        console.warn('SharedQuiz - No valid question IDs found, generating new questions');
        generateNewQuestions();
        return;
      }
      
      // Fetch questions from the database
      fetch(`/api/questions?ids=${questionIds.join(",")}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((result) => {
          console.log('SharedQuiz - Fetched questions by IDs:', result);
          if (result.success && result.data && result.data.length > 0) {
            setQuestions(result.data);
          } else {
            // Fallback to generating new questions if IDs don't return results
            console.warn('SharedQuiz - No questions found by IDs, generating new questions');
            generateNewQuestions();
          }
        })
        .catch((err) => {
          console.error("Failed to load questions:", err);
          generateNewQuestions();
        });
    } else {
      // If no questionsData, generate new questions
      console.log('SharedQuiz - No questionsData available, generating new questions');
      generateNewQuestions();
    }
    
    function generateNewQuestions() {
      if (!data?.data) return; // Guard against undefined data
      
      const params = new URLSearchParams({
        category: data.data.category || 'tech',
        difficulty: data.data.difficulty || 'medium',
        count: String(data.data.totalQuestions || 2),
        aiMode: 'true',
        types: 'mcq'
      });
      
      console.log('SharedQuiz - Generating new questions with params:', params.toString());
      
      fetch(`/api/questions?${params}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((result) => {
          console.log('SharedQuiz - Generated questions:', result);
          if (result.success && result.data) {
            setQuestions(result.data);
          }
        })
        .catch((err) => {
          console.error("Failed to generate questions:", err);
        });
    }
  }, [data]);

  // Record shared quiz completion
  const recordCompletionMutation = useMutation({
    mutationFn: async (attemptId: number) => {
      const response = await fetch(`/api/quiz/share/${linkId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizAttemptId: attemptId }),
      });

      if (!response.ok) {
        throw new Error("Failed to record completion");
      }

      return response.json();
    },
  });

  const handleQuizComplete = async (results: any) => {
    // The quiz completion is already recorded via /api/quiz/complete
    // We just need to link it to the shared quiz
    if (results.quizAttemptId) {
      setQuizAttemptId(results.quizAttemptId);
      await recordCompletionMutation.mutateAsync(results.quizAttemptId);
    }
    setQuizCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This quiz link is invalid, expired, or has been deactivated.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const sharedQuiz = data.data;

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <SharedQuizComparison linkId={linkId} />
        </div>
      </div>
    );
  }

  if (quizStarted && questions.length > 0) {
    return (
      <QuizPlayer
        questions={questions}
        config={{
          category: sharedQuiz.category,
          difficulty: sharedQuiz.difficulty as "easy" | "medium" | "hard",
          questionCount: sharedQuiz.totalQuestions,
          timedMode: false,
          questionTypes: [],
          voiceMode: false,
        }}
        onComplete={handleQuizComplete}
        onHintRequest={async () => "Hints are not available for shared quizzes"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Challenge
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {sharedQuiz.creatorUsername} challenges you to beat their score!
          </p>
        </div>

        {/* Quiz Info */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Category
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {sharedQuiz.category}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Difficulty
              </div>
              <div className="font-semibold text-gray-900 dark:text-white capitalize">
                {sharedQuiz.difficulty}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Questions
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {sharedQuiz.totalQuestions}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Creator's Score
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {sharedQuiz.creatorScore}/{sharedQuiz.totalQuestions}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Beat {sharedQuiz.creatorUsername}'s time!
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  They completed it in {formatTime(sharedQuiz.creatorTimeSpent)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setQuizStarted(true)}
            disabled={questions.length === 0}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {questions.length === 0 ? "Loading Questions..." : "Start Quiz"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
