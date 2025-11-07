import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import queryClient from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Loader2,
  RefreshCw,
  Plus,
  ListChecks,
  FileQuestion,
  Trophy,
  CheckCircle2,
  XCircle,
  Heart,
  ArrowRight,
  Archive,
  ChevronRight,
  Clock,
  AlarmClock,
  Settings2,
  HelpCircle,
} from "lucide-react";

// Define types for MCQs
interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Mcq {
  id: number;
  userId: number;
  documentId?: number | null;
  question: string;
  explanation: string;
  options: McqOption[];
  category: string;
  difficulty: string;
  createdAt: string;
}

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswers: Record<number, string>;
  correctAnswers: number;
  wrongAnswers: number;
  isCompleted: boolean;
  timeSpent: number;
}

export default function QuizMode() {
  const [activeTab, setActiveTab] = useState("take-quiz");
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    selectedAnswers: {},
    correctAnswers: 0,
    wrongAnswers: 0,
    isCompleted: false,
    timeSpent: 0,
  });
  const [isCreatingMcq, setIsCreatingMcq] = useState(false);
  const [quizTimer, setQuizTimer] = useState<NodeJS.Timeout | null>(null);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [newMcq, setNewMcq] = useState<{
    question: string;
    explanation: string;
    options: McqOption[];
    category: string;
    difficulty: string;
    topic: string; // For AI generation
  }>({
    question: "",
    explanation: "",
    options: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
      { id: "4", text: "", isCorrect: false },
    ],
    category: "general",
    difficulty: "medium",
    topic: "",
  });
  
  const { toast } = useToast();

  // Get all MCQs
  const { data: mcqs, isLoading, refetch } = useQuery({
    queryKey: ['/api/mcqs'],
    queryFn: async () => {
      const response = await apiRequest<Mcq[]>('/api/mcqs');
      return response || [];
    }
  });

  // Filter MCQs by category and difficulty
  const filteredMcqs = mcqs?.filter(mcq => 
    (selectedCategory === "all" || mcq.category === selectedCategory) &&
    (selectedDifficulty === "all" || mcq.difficulty === selectedDifficulty)
  ) || [];

  // Get unique categories and difficulties
  const categories = mcqs 
    ? ['all', ...Array.from(new Set(mcqs.map(mcq => mcq.category)))]
    : ['all'];
  
  const difficulties = mcqs
    ? ['all', ...Array.from(new Set(mcqs.map(mcq => mcq.difficulty)))]
    : ['all'];

  // Create a new MCQ
  const createMcqMutation = useMutation({
    mutationFn: async (mcqData: Omit<Mcq, 'id' | 'userId' | 'createdAt'>) => {
      return apiRequest<Mcq>('/api/mcqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mcqData),
      });
    },
    onSuccess: () => {
      toast({
        title: "MCQ created",
        description: "Your multiple-choice question has been created successfully.",
      });
      setNewMcq({
        question: "",
        explanation: "",
        options: [
          { id: "1", text: "", isCorrect: true },
          { id: "2", text: "", isCorrect: false },
          { id: "3", text: "", isCorrect: false },
          { id: "4", text: "", isCorrect: false },
        ],
        category: "general",
        difficulty: "medium",
        topic: "",
      });
      setIsCreatingMcq(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating MCQ",
        description: "There was an error creating your question. Please try again.",
        variant: "destructive",
      });
      console.error("Create MCQ error:", error);
    },
  });

  // Generate MCQ with AI
  const generateMcqMutation = useMutation({
    mutationFn: async (topic: string) => {
      return apiRequest<Mcq>('/api/mcqs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
    },
    onSuccess: (data) => {
      if (data) {
        setNewMcq({
          question: data.question,
          explanation: data.explanation,
          options: data.options,
          category: data.category || "general",
          difficulty: data.difficulty || "medium",
          topic: newMcq.topic,
        });
        toast({
          title: "MCQ generated",
          description: "AI has generated a question for you. Edit if needed before saving.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error generating MCQ",
        description: "There was an error generating your question. Please try again.",
        variant: "destructive",
      });
      console.error("Generate MCQ error:", error);
    },
  });

  // Handle form submission
  const handleCreateMcq = () => {
    if (!newMcq.question || newMcq.options.some(option => !option.text)) {
      toast({
        title: "Missing information",
        description: "Please provide a question and all option texts.",
        variant: "destructive",
      });
      return;
    }

    // Ensure at least one option is marked as correct
    if (!newMcq.options.some(option => option.isCorrect)) {
      toast({
        title: "No correct answer",
        description: "Please mark at least one option as correct.",
        variant: "destructive",
      });
      return;
    }

    createMcqMutation.mutate({
      question: newMcq.question,
      explanation: newMcq.explanation,
      options: newMcq.options,
      category: newMcq.category,
      difficulty: newMcq.difficulty,
      documentId: null,
    });
  };

  // Handle option change
  const handleOptionChange = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setNewMcq(prev => {
      const updatedOptions = prev.options.map(option => {
        if (option.id === id) {
          return { ...option, [field]: value };
        }
        // If marking this option as correct, mark others as incorrect (radio button behavior)
        if (field === 'isCorrect' && value === true) {
          return { ...option, isCorrect: option.id === id };
        }
        return option;
      });
      return { ...prev, options: updatedOptions };
    });
  };

  // Start quiz
  const startQuiz = () => {
    if (filteredMcqs.length === 0) {
      toast({
        title: "No questions available",
        description: "There are no questions available for the selected category and difficulty.",
        variant: "destructive",
      });
      return;
    }

    setQuizState({
      currentQuestionIndex: 0,
      selectedAnswers: {},
      correctAnswers: 0,
      wrongAnswers: 0,
      isCompleted: false,
      timeSpent: 0,
    });
    
    setIsQuizStarted(true);
    
    // Start timer
    const timer = setInterval(() => {
      setQuizState(prev => ({
        ...prev,
        timeSpent: prev.timeSpent + 1,
      }));
    }, 1000);
    
    setQuizTimer(timer);
  };

  // Submit answer
  const submitAnswer = (optionId: string) => {
    const currentQuestion = filteredMcqs[quizState.currentQuestionIndex];
    const correctOption = currentQuestion.options.find(opt => opt.isCorrect);
    const isCorrect = optionId === correctOption?.id;

    setQuizState(prev => ({
      ...prev,
      selectedAnswers: {
        ...prev.selectedAnswers,
        [currentQuestion.id]: optionId,
      },
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      wrongAnswers: !isCorrect ? prev.wrongAnswers + 1 : prev.wrongAnswers,
    }));
  };

  // Go to next question
  const goToNextQuestion = () => {
    if (quizState.currentQuestionIndex < filteredMcqs.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    } else {
      completeQuiz();
    }
  };

  // Complete quiz
  const completeQuiz = () => {
    if (quizTimer) {
      clearInterval(quizTimer);
      setQuizTimer(null);
    }
    
    setQuizState(prev => ({
      ...prev,
      isCompleted: true,
    }));
    
    setShowResultsDialog(true);
    setIsQuizStarted(false);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate quiz score percentage
  const calculateScore = () => {
    const { correctAnswers, wrongAnswers } = quizState;
    const total = correctAnswers + wrongAnswers;
    return total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (quizTimer) {
        clearInterval(quizTimer);
      }
    };
  }, [quizTimer]);

  // Get current question
  const currentQuestion = filteredMcqs[quizState.currentQuestionIndex];
  const hasAnsweredCurrent = currentQuestion && quizState.selectedAnswers[currentQuestion.id] !== undefined;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Quiz Mode</h1>
          <div className="flex gap-2">
            <Dialog open={isCreatingMcq} onOpenChange={setIsCreatingMcq}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                  <DialogTitle>Create New Question</DialogTitle>
                  <DialogDescription>
                    Create a new multiple-choice question or generate one with AI.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex justify-between">
                    <Label htmlFor="topic" className="mt-2">
                      Generate with AI:
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="topic"
                        placeholder="Enter a topic..."
                        className="w-64"
                        value={newMcq.topic}
                        onChange={(e) => setNewMcq({ ...newMcq, topic: e.target.value })}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (newMcq.topic) {
                            generateMcqMutation.mutate(newMcq.topic);
                          } else {
                            toast({
                              title: "Missing topic",
                              description: "Please enter a topic for AI generation.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={generateMcqMutation.isPending}
                      >
                        {generateMcqMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="question">Question</Label>
                    <Textarea
                      id="question"
                      value={newMcq.question}
                      onChange={(e) => setNewMcq({ ...newMcq, question: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Options (select one correct answer)</Label>
                    {newMcq.options.map((option, index) => (
                      <div key={option.id} className="flex items-start space-x-3">
                        <RadioGroup 
                          value={option.isCorrect ? option.id : ""}
                          onValueChange={(value) => {
                            if (value === option.id) {
                              handleOptionChange(option.id, 'isCorrect', true);
                            }
                          }}
                          className="mt-1"
                        >
                          <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                        </RadioGroup>
                        <div className="flex-1">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="explanation">Explanation (why the correct answer is right)</Label>
                    <Textarea
                      id="explanation"
                      value={newMcq.explanation}
                      onChange={(e) => setNewMcq({ ...newMcq, explanation: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newMcq.category}
                        onValueChange={(value) => setNewMcq({ ...newMcq, category: value })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="math">Math</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="literature">Literature</SelectItem>
                          <SelectItem value="programming">Programming</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={newMcq.difficulty}
                        onValueChange={(value) => setNewMcq({ ...newMcq, difficulty: value })}
                      >
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreatingMcq(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCreateMcq} disabled={createMcqMutation.isPending}>
                    {createMcqMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Question"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="take-quiz" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="take-quiz">Take Quiz</TabsTrigger>
            <TabsTrigger value="question-bank">Question Bank</TabsTrigger>
          </TabsList>
          
          <TabsContent value="take-quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
                <CardDescription>
                  Configure your quiz parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-category">Category</Label>
                      <Select 
                        value={selectedCategory} 
                        onValueChange={setSelectedCategory}
                        disabled={isQuizStarted}
                      >
                        <SelectTrigger id="quiz-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Categories</SelectLabel>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category === 'all' ? 'All Categories' : 
                                  category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiz-difficulty">Difficulty</Label>
                      <Select 
                        value={selectedDifficulty} 
                        onValueChange={setSelectedDifficulty}
                        disabled={isQuizStarted}
                      >
                        <SelectTrigger id="quiz-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Difficulty</SelectLabel>
                            {difficulties.map((difficulty) => (
                              <SelectItem key={difficulty} value={difficulty}>
                                {difficulty === 'all' ? 'All Difficulties' : 
                                  difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="space-y-2 mb-4">
                      <Label>Quiz Summary</Label>
                      <div className="bg-muted p-4 rounded-md space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Questions:</span>
                          <span className="text-sm font-medium">{filteredMcqs?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Category:</span>
                          <span className="text-sm font-medium">
                            {selectedCategory === 'all' ? 'All Categories' : 
                              selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Difficulty:</span>
                          <span className="text-sm font-medium">
                            {selectedDifficulty === 'all' ? 'All Difficulties' : 
                              selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={startQuiz} 
                      disabled={isLoading || filteredMcqs.length === 0 || isQuizStarted}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ListChecks className="mr-2 h-4 w-4" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isQuizStarted && currentQuestion && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Question {quizState.currentQuestionIndex + 1} of {filteredMcqs.length}</CardTitle>
                      <CardDescription>
                        {currentQuestion.category} • {currentQuestion.difficulty}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatTime(quizState.timeSpent)}</span>
                    </div>
                  </div>
                  <Progress 
                    value={((quizState.currentQuestionIndex + 1) / filteredMcqs.length) * 100} 
                    className="h-2 mt-2" 
                  />
                </CardHeader>
                <CardContent className="py-6">
                  <h3 className="text-lg font-medium mb-6">{currentQuestion.question}</h3>
                  <div className="space-y-4">
                    <RadioGroup
                      value={quizState.selectedAnswers[currentQuestion.id] || ""}
                      onValueChange={(value) => {
                        if (!hasAnsweredCurrent) {
                          submitAnswer(value);
                        }
                      }}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option) => {
                        const isSelected = quizState.selectedAnswers[currentQuestion.id] === option.id;
                        const showResult = hasAnsweredCurrent;
                        const isCorrect = option.isCorrect;
                        let optionClassName = "border p-4 rounded-md";
                        
                        if (showResult) {
                          if (isSelected && isCorrect) {
                            optionClassName += " bg-green-50 border-green-200";
                          } else if (isSelected && !isCorrect) {
                            optionClassName += " bg-red-50 border-red-200";
                          } else if (!isSelected && isCorrect) {
                            optionClassName += " bg-green-50 border-green-200";
                          }
                        } else if (isSelected) {
                          optionClassName += " border-primary/50 bg-primary/5";
                        }
                        
                        return (
                          <div key={option.id} className={optionClassName}>
                            <div className="flex items-start">
                              <RadioGroupItem 
                                value={option.id} 
                                id={`option-${currentQuestion.id}-${option.id}`} 
                                disabled={hasAnsweredCurrent}
                                className="mt-1"
                              />
                              <div className="ml-3">
                                <Label 
                                  htmlFor={`option-${currentQuestion.id}-${option.id}`}
                                  className="text-base font-normal"
                                >
                                  {option.text}
                                </Label>
                                {showResult && isCorrect && (
                                  <p className="text-sm text-green-600 mt-1">
                                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                                    Correct answer
                                  </p>
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <p className="text-sm text-red-600 mt-1">
                                    <XCircle className="h-4 w-4 inline mr-1" />
                                    Incorrect answer
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  {hasAnsweredCurrent && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                      <h4 className="font-medium text-blue-700 mb-1">Explanation</h4>
                      <p className="text-blue-700">{currentQuestion.explanation}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex gap-1 items-center">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>{quizState.correctAnswers}</span>
                    </Badge>
                    <Badge variant="outline" className="flex gap-1 items-center">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span>{quizState.wrongAnswers}</span>
                    </Badge>
                  </div>
                  
                  <Button 
                    disabled={!hasAnsweredCurrent}
                    onClick={goToNextQuestion}
                  >
                    {quizState.currentQuestionIndex === filteredMcqs.length - 1 ? (
                      <>Finish Quiz</>
                    ) : (
                      <>Next Question</>
                    )}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="question-bank">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categories</SelectLabel>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'All Categories' : 
                            category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Difficulty</SelectLabel>
                      {difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty === 'all' ? 'All Difficulties' : 
                            difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredMcqs.length} questions
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center my-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMcqs.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <FileQuestion className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold">No Questions Available</h3>
                <p className="text-gray-500 max-w-md mx-auto my-2">
                  Create your first question to start building your quiz bank.
                </p>
                <Button className="mt-4" onClick={() => setIsCreatingMcq(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMcqs.map((mcq) => (
                  <Card key={mcq.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="space-x-2">
                          <Badge variant="outline" className="capitalize">
                            {mcq.category}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {mcq.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-bold text-lg mb-4">{mcq.question}</h3>
                      <div className="space-y-2">
                        {mcq.options.map((option) => (
                          <div 
                            key={option.id} 
                            className={`
                              p-3 rounded-md border 
                              ${option.isCorrect ? "border-green-200 bg-green-50" : "border-gray-200"}
                            `}
                          >
                            <div className="flex items-start">
                              <div className={`
                                flex-shrink-0 h-5 w-5 mt-0.5 rounded-full border 
                                flex items-center justify-center
                                ${option.isCorrect 
                                  ? "bg-green-100 border-green-300 text-green-500" 
                                  : "bg-gray-100 border-gray-300"}
                              `}>
                                {option.isCorrect && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                              <span className="ml-3 text-sm">{option.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {mcq.explanation && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                          <h4 className="font-medium text-sm text-blue-700 mb-1">Explanation</h4>
                          <p className="text-sm text-blue-700">{mcq.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quiz Results Dialog */}
      <AlertDialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Quiz Completed!</AlertDialogTitle>
            <AlertDialogDescription>
              Here's how you did on this quiz
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">{calculateScore()}%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-1" />
                  <span className="text-lg font-bold">{quizState.correctAnswers}</span>
                </div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-5 w-5 text-red-500 mr-1" />
                  <span className="text-lg font-bold">{quizState.wrongAnswers}</span>
                </div>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-blue-500 mr-1" />
                <span className="text-lg font-bold">{formatTime(quizState.timeSpent)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </div>
            <div className="text-center">
              {calculateScore() >= 80 ? (
                <div className="text-green-600 flex justify-center items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  <span className="font-medium">Excellent work!</span>
                </div>
              ) : calculateScore() >= 60 ? (
                <div className="text-blue-600 flex justify-center items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  <span className="font-medium">Good job!</span>
                </div>
              ) : (
                <div className="text-amber-600 flex justify-center items-center">
                  <ArrowRight className="h-5 w-5 mr-2" />
                  <span className="font-medium">Keep practicing!</span>
                </div>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => startQuiz()}>Retry Quiz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}