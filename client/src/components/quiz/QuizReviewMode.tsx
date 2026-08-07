import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  ArrowLeft,
  Lightbulb
} from "lucide-react";
import { Question } from "@/../../shared/quiz-types";

interface QuestionAttempt {
  questionId: number;
  userAnswer: string | string[] | Record<string, string>;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
}

interface QuizReviewModeProps {
  questions: Question[];
  userAnswers: Record<number, any>;
  questionAttempts?: Record<number, QuestionAttempt>;
  onBack: () => void;
}

export default function QuizReviewMode({
  questions,
  userAnswers,
  questionAttempts,
  onBack,
}: QuizReviewModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  
  const currentQuestion = questions[currentIndex];
  const userAnswer = userAnswers[currentQuestion.id];
  const attempt = questionAttempts?.[currentQuestion.id];
  const correctAnswer = correctAnswers[currentQuestion.id];

  // IMPORTANT: Use the isCorrect flag from the attempt (validated by backend)
  const questionCorrect = attempt?.isCorrect ?? false;

  // Fetch correct answers from backend for all questions
  useEffect(() => {
    const fetchCorrectAnswers = async () => {
      try {
        setLoading(true);
        const answers: Record<number, any> = {};
        
        // Fetch correct answer for each question
        for (const question of questions) {
          try {
            const response = await fetch('/api/quiz/get-correct-answer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                questionId: question.id,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              answers[question.id] = data.correctAnswer;
            }
          } catch (error) {

          }
        }
        
        setCorrectAnswers(answers);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };
    
    fetchCorrectAnswers();
  }, [questions]);

  const renderAnswer = () => {
    switch (currentQuestion.type) {
      case 'mcq':
        if (loading) {
          return <div className="text-center py-4">Loading correct answers...</div>;
        }
        
        return (
          <div className="space-y-2">
            {(currentQuestion.questionData as any)?.options?.map((option: any) => {
              const isUserAnswer = userAnswer?.toString().toLowerCase() === option.id?.toString().toLowerCase();
              const isCorrectAnswer = correctAnswer && option.id?.toString().toLowerCase() === correctAnswer?.toString().toLowerCase();
              
              // Show green if it's the correct answer
              // Show red if it's user's wrong answer
              const showAsCorrect = isCorrectAnswer;
              const showAsIncorrect = isUserAnswer && !questionCorrect;
              
              return (
                <div
                  key={option.id}
                  className={`p-3 rounded-lg border-2 ${
                    showAsCorrect
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                      : showAsIncorrect
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-500'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {showAsCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {showAsIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                    <span className="font-medium">{option.id.toUpperCase()}.</span>
                    <span>{option.text}</span>
                    {isCorrectAnswer && (
                      <Badge variant="default" className="ml-auto bg-green-600">Correct Answer</Badge>
                    )}
                    {isUserAnswer && !questionCorrect && (
                      <Badge variant="destructive" className="ml-auto">Your Answer</Badge>
                    )}
                    {isUserAnswer && questionCorrect && (
                      <Badge variant="default" className="ml-auto bg-green-600">Your Answer ✓</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'true-false':
        if (loading) {
          return <div className="text-center py-4">Loading correct answers...</div>;
        }
        
        return (
          <div className="space-y-2">
            {['true', 'false'].map((option) => {
              const isUserAnswer = userAnswer?.toString().toLowerCase() === option.toLowerCase();
              const isCorrectAnswer = correctAnswer && option.toLowerCase() === correctAnswer?.toString().toLowerCase();
              
              const showAsCorrect = isCorrectAnswer;
              const showAsIncorrect = isUserAnswer && !questionCorrect;
              
              return (
                <div
                  key={option}
                  className={`p-3 rounded-lg border-2 ${
                    showAsCorrect
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                      : showAsIncorrect
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-500'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {showAsCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {showAsIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                    <span className="capitalize font-medium">{option}</span>
                    {isCorrectAnswer && (
                      <Badge variant="default" className="ml-auto bg-green-600">Correct Answer</Badge>
                    )}
                    {isUserAnswer && !questionCorrect && (
                      <Badge variant="destructive" className="ml-auto">Your Answer</Badge>
                    )}
                    {isUserAnswer && questionCorrect && (
                      <Badge variant="default" className="ml-auto bg-green-600">Your Answer ✓</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'fill-blank':
        const correctAnswers = Array.isArray(currentQuestion.correctAnswer) 
          ? currentQuestion.correctAnswer as string[]
          : [currentQuestion.correctAnswer as string];
        const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        
        return (
          <div className="space-y-3">
            {correctAnswers.map((correct, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Blank {idx + 1}:</div>
                <div className="flex gap-2 items-center">
                  <Badge variant={userAnswersArray[idx]?.toLowerCase().trim() === correct.toLowerCase().trim() ? "default" : "destructive"}>
                    Your answer: {userAnswersArray[idx] || "(empty)"}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-500">
                    Correct: {correct}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        );

      case 'matching':
        const correctPairs = currentQuestion.correctAnswer as Record<string, string>;
        const userPairs = userAnswer as Record<string, string> || {};
        
        return (
          <div className="space-y-2">
            {Object.entries(correctPairs).map(([left, right]) => {
              const userRight = userPairs[left];
              const isCorrect = userRight === right;
              
              return (
                <div
                  key={left}
                  className={`p-3 rounded-lg border-2 ${
                    isCorrect
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">{left}</span>
                    <span className="text-muted-foreground">→</span>
                    {!isCorrect && userRight && (
                      <>
                        <span className="line-through text-red-600">{userRight}</span>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <span className="text-green-600 font-medium">{right}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'rearrange':
        const correctOrder = Array.isArray(currentQuestion.correctAnswer) ? (currentQuestion.correctAnswer as unknown as number[]) : [];
        const userOrder = Array.isArray(userAnswer) ? (userAnswer as unknown as number[]) : [];
        const items = (currentQuestion.questionData as any)?.items || [];
        
        return (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-2">Your Order:</div>
              <div className="space-y-2">
                {userOrder.map((idx, position) => (
                  <div
                    key={position}
                    className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-500"
                  >
                    {position + 1}. {items[idx]}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Correct Order:</div>
              <div className="space-y-2">
                {correctOrder.map((idx, position) => (
                  <div
                    key={position}
                    className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-500"
                  >
                    {position + 1}. {items[idx]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Answer format not supported</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-4"
    >
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Results
      </Button>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Question {currentIndex + 1} of {questions.length}
              {questionCorrect ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Correct
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  Incorrect
                </Badge>
              )}
            </CardTitle>
            <Badge variant="outline">{currentQuestion.type.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
            {renderAnswer()}
          </div>

          {currentQuestion.explanation && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Explanation
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
