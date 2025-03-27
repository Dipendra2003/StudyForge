import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, RefreshCw, Check, X, ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";

// Define the Flashcard type
interface Flashcard {
  id: number;
  userId: number;
  documentId?: number | null;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  nextReviewDate?: string | null;
  createdAt: string;
}

export default function Flashcards() {
  const [activeTab, setActiveTab] = useState("study");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newCard, setNewCard] = useState<{
    question: string;
    answer: string;
    category: string;
    difficulty: string;
  }>({
    question: "",
    answer: "",
    category: "general",
    difficulty: "medium",
  });
  
  const { toast } = useToast();

  // Get all flashcards
  const { data: flashcards, isLoading, refetch } = useQuery({
    queryKey: ['/api/flashcards'],
    queryFn: async () => {
      const response = await apiRequest<Flashcard[]>('/api/flashcards');
      return response || [];
    }
  });

  // Filter flashcards by category
  const filteredFlashcards = flashcards?.filter(card => 
    selectedCategory === "all" || card.category === selectedCategory
  ) || [];

  // Get unique categories
  const categories = flashcards 
    ? ['all', ...Array.from(new Set(flashcards.map(card => card.category)))]
    : ['all'];

  // Create a new flashcard
  const createFlashcardMutation = useMutation({
    mutationFn: async (flashcardData: Omit<Flashcard, 'id' | 'userId' | 'createdAt'>) => {
      return apiRequest<Flashcard>('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashcardData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Flashcard created",
        description: "Your flashcard has been created successfully.",
      });
      setNewCard({
        question: "",
        answer: "",
        category: "general",
        difficulty: "medium",
      });
      setIsCreatingCard(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating flashcard",
        description: "There was an error creating your flashcard. Please try again.",
        variant: "destructive",
      });
      console.error("Create flashcard error:", error);
    },
  });

  // Generate flashcard with AI
  const generateFlashcardMutation = useMutation({
    mutationFn: async (topic: string) => {
      return apiRequest<Flashcard>('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
    },
    onSuccess: (data) => {
      setNewCard({
        question: data.question,
        answer: data.answer,
        category: data.category || "general",
        difficulty: data.difficulty || "medium",
      });
      toast({
        title: "Flashcard generated",
        description: "AI has generated a flashcard for you. Edit if needed before saving.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating flashcard",
        description: "There was an error generating your flashcard. Please try again.",
        variant: "destructive",
      });
      console.error("Generate flashcard error:", error);
    },
  });

  // Handle form submission
  const handleCreateFlashcard = () => {
    if (!newCard.question || !newCard.answer) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer.",
        variant: "destructive",
      });
      return;
    }

    createFlashcardMutation.mutate({
      question: newCard.question,
      answer: newCard.answer,
      category: newCard.category,
      difficulty: newCard.difficulty,
      documentId: null,
      nextReviewDate: null,
    });
  };

  // Handle navigation between cards
  const goToNextCard = () => {
    if (filteredFlashcards.length > 0) {
      setCurrentCardIndex((prevIndex) => 
        prevIndex === filteredFlashcards.length - 1 ? 0 : prevIndex + 1
      );
      setShowAnswer(false);
    }
  };

  const goToPrevCard = () => {
    if (filteredFlashcards.length > 0) {
      setCurrentCardIndex((prevIndex) => 
        prevIndex === 0 ? filteredFlashcards.length - 1 : prevIndex - 1
      );
      setShowAnswer(false);
    }
  };

  // Reset current card index when filtered cards change
  useEffect(() => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
  }, [selectedCategory]);

  // Get current card
  const currentCard = filteredFlashcards[currentCardIndex];

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <div className="flex gap-2">
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categories</SelectLabel>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Dialog open={isCreatingCard} onOpenChange={setIsCreatingCard}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flashcard
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Create New Flashcard</DialogTitle>
                  <DialogDescription>
                    Create a new flashcard or generate one with AI.
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
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const topicInput = document.getElementById('topic') as HTMLInputElement;
                          if (topicInput && topicInput.value) {
                            generateFlashcardMutation.mutate(topicInput.value);
                          }
                        }}
                        disabled={generateFlashcardMutation.isPending}
                      >
                        {generateFlashcardMutation.isPending ? (
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
                      value={newCard.question}
                      onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="answer">Answer</Label>
                    <Textarea
                      id="answer"
                      value={newCard.answer}
                      onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newCard.category}
                        onValueChange={(value) => setNewCard({ ...newCard, category: value })}
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
                        value={newCard.difficulty}
                        onValueChange={(value) => setNewCard({ ...newCard, difficulty: value })}
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
                  <Button type="button" variant="outline" onClick={() => setIsCreatingCard(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCreateFlashcard} disabled={createFlashcardMutation.isPending}>
                    {createFlashcardMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Flashcard"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="study" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="study">Study Mode</TabsTrigger>
            <TabsTrigger value="all">All Flashcards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="study" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFlashcards.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold">No Flashcards Available</h3>
                <p className="text-gray-500">
                  Create your first flashcard to start studying.
                </p>
                <Button className="mt-4" onClick={() => setIsCreatingCard(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flashcard
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-2xl">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Card {currentCardIndex + 1} of {filteredFlashcards.length}</span>
                    <span>Category: {currentCard?.category}</span>
                  </div>
                  <Card className="h-[400px] w-full">
                    <CardContent className="flex flex-col items-center justify-center h-full p-8">
                      <div className="text-center">
                        <p className="text-xl font-medium mb-6">{currentCard?.question}</p>
                        {showAnswer ? (
                          <div className="mt-8 p-4 bg-muted rounded-lg">
                            <p className="text-lg">{currentCard?.answer}</p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setShowAnswer(true)}
                            className="mt-8"
                          >
                            Show Answer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                    {showAnswer && (
                      <CardFooter className="justify-center space-x-4 border-t p-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" /> Incorrect
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex items-center gap-1 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                        >
                          <Check className="h-4 w-4" /> Correct
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={goToPrevCard}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" onClick={goToNextCard}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFlashcards.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold">No Flashcards Available</h3>
                <p className="text-gray-500">
                  Create your first flashcard to start studying.
                </p>
                <Button className="mt-4" onClick={() => setIsCreatingCard(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flashcard
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFlashcards.map((card) => (
                  <Card key={card.id} className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary mr-2">
                            {card.category}
                          </span>
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {card.difficulty}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-bold text-lg mb-2">Q:</h3>
                      <p className="text-gray-700 mb-4">{card.question}</p>
                      <h3 className="font-bold text-lg mb-2">A:</h3>
                      <p className="text-gray-700">{card.answer}</p>
                    </CardContent>
                    <CardFooter className="text-xs text-gray-500 justify-between">
                      <span>Created: {new Date(card.createdAt).toLocaleDateString()}</span>
                      {card.nextReviewDate && (
                        <span>Next review: {new Date(card.nextReviewDate).toLocaleDateString()}</span>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}