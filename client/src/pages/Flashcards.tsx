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
  CardFooter,
  CardHeader,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Plus, Check, X, ChevronLeft, ChevronRight, BookOpen, Loader2, Sparkles, Brain, Target, TrendingUp, Flame, Shuffle, Upload, XCircle, Image as ImageIcon, Keyboard, Download } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { FlipCard } from "@/components/FlipCard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { DeckManagement } from "@/components/DeckManagement";
import { AddToDeckDialog } from "@/components/AddToDeckDialog";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ExportDialog } from "@/components/ExportDialog";
import { FlashcardCard } from "@/components/FlashcardCard";
import { VirtualizedFlashcardGrid } from "@/components/VirtualizedFlashcardGrid";
import { FlashcardGridSkeleton } from "@/components/FlashcardSkeleton";
import { useDebounce } from "@/hooks/useDebounce";

// Define the Flashcard type
interface Flashcard {
  id: number;
  userId: number;
  documentId?: number | null;
  question: string;
  answer: string;
  questionImage?: string | null;
  answerImage?: string | null;
  category: string;
  difficulty: string;
  nextReviewDate?: string | null;
  easeFactor?: number;
  createdAt: string;
}

export default function Flashcards() {
  // Persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('flashcardsActiveTab') || "study";
  });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [reviewMode, setReviewMode] = useState<'all' | 'due' | 'new' | 'difficult'>('all');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [selectedDeckName, setSelectedDeckName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newCard, setNewCard] = useState<{
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    questionImage?: string | null;
    answerImage?: string | null;
  }>({
    question: "",
    answer: "",
    category: "general",
    difficulty: "medium",
    questionImage: null,
    answerImage: null,
  });
  const [userStats, setUserStats] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [addingToDeckCardId, setAddingToDeckCardId] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  // Parse URL parameters on mount to check for search query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTopic = params.get('q');
    if (queryTopic) {
      setSearchQuery(queryTopic);
      setActiveTab('browse');
    }
  }, []);

  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('flashcardsActiveTab', activeTab);
  }, [activeTab]);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Keyboard shortcuts for study mode
  useKeyboardShortcuts({
    onRevealAnswer: () => {
      if (activeTab === 'study' && !showAnswer && currentCard) {
        setShowAnswer(true);
      }
    },
    onPreviousCard: () => {
      if (activeTab === 'study' && filteredFlashcards.length > 0) {
        goToPrevCard();
      }
    },
    onNextCard: () => {
      if (activeTab === 'study' && filteredFlashcards.length > 0) {
        goToNextCard();
      }
    },
    onMarkIncorrect: () => {
      if (activeTab === 'study' && showAnswer && currentCard && !reviewFlashcardMutation.isPending) {
        reviewFlashcardMutation.mutate({ id: currentCard.id, correct: false });
      }
    },
    onMarkCorrect: () => {
      if (activeTab === 'study' && showAnswer && currentCard && !reviewFlashcardMutation.isPending) {
        reviewFlashcardMutation.mutate({ id: currentCard.id, correct: true });
      }
    },
    isAnswerVisible: showAnswer,
    isDialogOpen: isCreatingCard || isEditingCard,
    enabled: activeTab === 'study',
  });

  // Handle image upload
  const handleImageUpload = (
    file: File,
    type: 'question' | 'answer',
    isEditing: boolean = false
  ) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      if (isEditing && editingCard) {
        if (type === 'question') {
          setEditingCard({ ...editingCard, questionImage: base64String });
        } else {
          setEditingCard({ ...editingCard, answerImage: base64String });
        }
      } else {
        if (type === 'question') {
          setNewCard({ ...newCard, questionImage: base64String });
        } else {
          setNewCard({ ...newCard, answerImage: base64String });
        }
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the image file.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = (type: 'question' | 'answer', isEditing: boolean = false) => {
    if (isEditing && editingCard) {
      if (type === 'question') {
        setEditingCard({ ...editingCard, questionImage: null });
      } else {
        setEditingCard({ ...editingCard, answerImage: null });
      }
    } else {
      if (type === 'question') {
        setNewCard({ ...newCard, questionImage: null });
      } else {
        setNewCard({ ...newCard, answerImage: null });
      }
    }
  };

  // Get all flashcards
  const { data: flashcards, isLoading, refetch } = useQuery({
    queryKey: ['/api/flashcards'],
    queryFn: async () => {
      const response = await apiRequest<{ flashcards: Flashcard[] } | { data: Flashcard[] }>('/api/flashcards');
      // Handle both response formats (direct flashcards array or paginated response)
      if (response && 'flashcards' in response) {
        return response.flashcards || [];
      } else if (response && 'data' in response) {
        return response.data || [];
      }
      return [];
    }
  });

  // Get flashcards by deck ID when a deck is selected
  const { data: deckFlashcards, isLoading: isDeckLoading } = useQuery({
    queryKey: ['/api/decks', selectedDeckId],
    queryFn: async () => {
      if (!selectedDeckId) return null;
      const response = await apiRequest<{ deck: { cards: Flashcard[]; name: string } }>(`/api/decks/${selectedDeckId}`);
      return response.deck;
    },
    enabled: !!selectedDeckId,
  });

  // Fetch user stats for streak display
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch("/api/user-stats", {
          credentials: 'include',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserStats(data.stats);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };
    
    fetchUserStats();
  }, []);

  // Review flashcard mutation (for spaced repetition)
  const reviewFlashcardMutation = useMutation({
    mutationFn: async ({ id, correct }: { id: number; correct: boolean }) => {
      return apiRequest(`/api/flashcards/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correct }),
      });
    },
    onSuccess: (data, variables) => {
      if (variables.correct) {
        triggerConfetti();
      }
      
      toast({
        title: variables.correct ? "Correct! 🎉" : "Keep practicing 💪",
        description: variables.correct 
          ? "Great job! This card will be reviewed later." 
          : "Don't worry, you'll see this card again soon.",
      });
      
      // Refresh stats
      const token = localStorage.getItem('accessToken');
      fetch("/api/user-stats", { 
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })
        .then(res => res.json())
        .then(data => setUserStats(data.stats))
        .catch(console.error);
      
      refetch();
      goToNextCard();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record your review. Please try again.",
        variant: "destructive",
      });
      console.error("Review error:", error);
    },
  });

  // Function to filter cards based on review mode and search query
  const getFilteredCards = (cards: Flashcard[]) => {
    if (!cards) return [];
    
    // First filter by category
    let filtered = cards.filter(card => 
      selectedCategory === "all" || card.category === selectedCategory
    );
    
    // Then filter by search query (debounced)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.question.toLowerCase().includes(query) ||
        card.answer.toLowerCase().includes(query) ||
        card.category.toLowerCase().includes(query)
      );
    }
    
    // Then filter by review mode
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (reviewMode) {
      case 'due':
        // Cards where nextReviewDate is today or earlier
        filtered = filtered.filter(card => {
          if (!card.nextReviewDate) return false;
          const reviewDate = new Date(card.nextReviewDate);
          reviewDate.setHours(0, 0, 0, 0);
          return reviewDate <= today;
        });
        break;
      case 'new':
        // Cards where nextReviewDate is null
        filtered = filtered.filter(card => card.nextReviewDate === null || card.nextReviewDate === undefined);
        break;
      case 'difficult':
        // Cards where easeFactor is less than 200
        filtered = filtered.filter(card => card.easeFactor !== undefined && card.easeFactor < 200);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }
    
    return filtered;
  };

  // Filter flashcards by category and review mode
  // Use deck flashcards if a deck is selected, otherwise use all flashcards
  const cardsToFilter = selectedDeckId && deckFlashcards ? deckFlashcards.cards : (flashcards || []);
  const filteredFlashcards = getFilteredCards(cardsToFilter);
  const isLoadingCards = selectedDeckId ? isDeckLoading : isLoading;

  // Function to shuffle cards
  const shuffleCards = () => {
    const indices = Array.from({ length: filteredFlashcards.length }, (_, i) => i);
    // Fisher-Yates shuffle algorithm
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setShuffleMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  // Function to toggle shuffle mode
  const toggleShuffle = () => {
    if (shuffleMode) {
      // Turn off shuffle mode
      setShuffleMode(false);
      setShuffledIndices([]);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } else {
      // Turn on shuffle mode
      shuffleCards();
    }
  };

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
        questionImage: null,
        answerImage: null,
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

  // Update flashcard mutation
  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Flashcard> }) => {
      return apiRequest<Flashcard>(`/api/flashcards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Flashcard updated",
        description: "Your flashcard has been updated successfully.",
      });
      setEditingCard(null);
      setIsEditingCard(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error updating flashcard",
        description: "There was an error updating your flashcard. Please try again.",
        variant: "destructive",
      });
      console.error("Update flashcard error:", error);
    },
  });

  // Delete flashcard mutation
  const deleteFlashcardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/flashcards/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Flashcard deleted",
        description: "Your flashcard has been deleted successfully.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error deleting flashcard",
        description: "There was an error deleting your flashcard. Please try again.",
        variant: "destructive",
      });
      console.error("Delete flashcard error:", error);
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

    const flashcardData: any = {
      question: newCard.question,
      answer: newCard.answer,
      category: newCard.category,
      difficulty: newCard.difficulty,
    };

    // Only include optional fields if they have values
    if (newCard.questionImage) {
      flashcardData.questionImage = newCard.questionImage;
    }
    if (newCard.answerImage) {
      flashcardData.answerImage = newCard.answerImage;
    }

    createFlashcardMutation.mutate(flashcardData);
  };

  // Handle edit flashcard
  const handleEditFlashcard = () => {
    if (!editingCard) return;

    if (!editingCard.question || !editingCard.answer) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      question: editingCard.question,
      answer: editingCard.answer,
      category: editingCard.category,
      difficulty: editingCard.difficulty,
    };

    // Only include optional fields if they have values
    if (editingCard.questionImage) {
      updateData.questionImage = editingCard.questionImage;
    }
    if (editingCard.answerImage) {
      updateData.answerImage = editingCard.answerImage;
    }

    updateFlashcardMutation.mutate({
      id: editingCard.id,
      data: updateData,
    });
  };

  // Open edit dialog
  const openEditDialog = (card: Flashcard) => {
    setEditingCard({ ...card });
    setIsEditingCard(true);
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
    // Apply shuffle to filtered cards if shuffle mode is active
    if (shuffleMode && filteredFlashcards.length > 0) {
      const indices = Array.from({ length: filteredFlashcards.length }, (_, i) => i);
      // Fisher-Yates shuffle algorithm
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
    } else {
      setShuffledIndices([]);
    }
  }, [selectedCategory, reviewMode, shuffleMode, filteredFlashcards.length, selectedDeckId, debouncedSearchQuery]);

  // Get current card (considering shuffle mode)
  const currentCard = shuffleMode && shuffledIndices.length > 0
    ? filteredFlashcards[shuffledIndices[currentCardIndex]]
    : filteredFlashcards[currentCardIndex];

  // Trigger confetti on correct answer
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <DashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                  Flashcards
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Master your knowledge with spaced repetition
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 w-fit">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-primary">
                    {filteredFlashcards.length} Cards
                  </span>
                </div>
                {userStats && userStats.streakDays > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 w-fit">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs sm:text-sm font-medium text-orange-600">
                      {userStats.streakDays} Day Streak
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-3 mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="🔍 Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:flex-1 border-2 hover:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full sm:w-[200px] border-2 hover:border-primary transition-colors">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? '📚 All Categories' : `📖 ${category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown'}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select 
                value={reviewMode} 
                onValueChange={(value: 'all' | 'due' | 'new' | 'difficult') => setReviewMode(value)}
              >
                <SelectTrigger className="w-full sm:w-[200px] border-2 hover:border-primary transition-colors">
                  <SelectValue placeholder="Review Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Review Mode</SelectLabel>
                    <SelectItem value="all">
                      📚 All Cards
                    </SelectItem>
                    <SelectItem value="due">
                      ⏰ Due for Review
                    </SelectItem>
                    <SelectItem value="new">
                      ✨ New Cards
                    </SelectItem>
                    <SelectItem value="difficult">
                      🔥 Difficult Cards
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button 
                variant={shuffleMode ? "default" : "outline"}
                onClick={toggleShuffle}
                className={cn(
                  "w-full sm:w-auto transition-all",
                  shuffleMode && "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md"
                )}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                {shuffleMode ? "Shuffled" : "Shuffle"}
              </Button>
            </div>
            <Dialog open={isCreatingCard} onOpenChange={setIsCreatingCard}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flashcard
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        Create New Flashcard
                      </DialogTitle>
                      <DialogDescription className="text-sm mt-1">
                        Build your knowledge, one card at a time ✨
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid gap-6 px-6 py-6 overflow-y-auto flex-1 min-h-0">
                  {/* AI Generation Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative p-5 rounded-xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border-2 border-purple-200/50 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl -z-10" />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <Label htmlFor="topic" className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        AI-Powered Generation
                      </Label>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium">
                        Beta
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="topic"
                        placeholder="e.g., 'Python loops', 'World War II', 'Photosynthesis'..."
                        className="flex-1 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                      />
                      <Button 
                        variant="default"
                        onClick={() => {
                          const topicInput = document.getElementById('topic') as HTMLInputElement;
                          if (topicInput && topicInput.value) {
                            generateFlashcardMutation.mutate(topicInput.value);
                          } else {
                            toast({
                              title: "Missing topic",
                              description: "Please enter a topic to generate a flashcard.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={generateFlashcardMutation.isPending}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg transition-all"
                      >
                        {generateFlashcardMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      AI will create a comprehensive flashcard for you
                    </p>
                  </motion.div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground font-medium">Or create manually</span>
                    </div>
                  </div>
                  {/* Question Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10 border border-blue-200/50 dark:border-blue-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <Label htmlFor="question" className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Question
                      </Label>
                      <span className="text-xs text-red-500">*</span>
                    </div>
                    <Textarea
                      id="question"
                      value={newCard.question}
                      onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                      rows={3}
                      placeholder="What do you want to remember? (e.g., 'What is the capital of France?')"
                      className="border-2 border-blue-200 dark:border-blue-800 focus:border-blue-400 dark:focus:border-blue-600 resize-none bg-white/50 dark:bg-black/20 backdrop-blur-sm transition-all"
                    />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Add Image (Optional)
                      </Label>
                      {newCard.questionImage ? (
                        <div className="relative group">
                          <img
                            src={newCard.questionImage}
                            alt="Question preview"
                            className="max-w-full max-h-40 rounded-lg object-contain border-2 border-blue-200 dark:border-blue-800 shadow-sm"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => removeImage('question', false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            id="question-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, 'question', false);
                              }
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('question-image')?.click()}
                            className="w-full border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {/* Answer Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 border border-green-200/50 dark:border-green-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-500/10">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <Label htmlFor="answer" className="text-sm font-semibold text-green-900 dark:text-green-100">
                        Answer
                      </Label>
                      <span className="text-xs text-red-500">*</span>
                    </div>
                    <Textarea
                      id="answer"
                      value={newCard.answer}
                      onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                      rows={4}
                      placeholder="The correct answer or explanation..."
                      className="border-2 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600 resize-none bg-white/50 dark:bg-black/20 backdrop-blur-sm transition-all"
                    />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Add Image (Optional)
                      </Label>
                      {newCard.answerImage ? (
                        <div className="relative group">
                          <img
                            src={newCard.answerImage}
                            alt="Answer preview"
                            className="max-w-full max-h-40 rounded-lg object-contain border-2 border-green-200 dark:border-green-800 shadow-sm"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => removeImage('answer', false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            id="answer-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, 'answer', false);
                              }
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('answer-image')?.click()}
                            className="w-full border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {/* Metadata Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-200/50 dark:border-amber-800/50"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        Category
                      </Label>
                      <Select
                        value={newCard.category}
                        onValueChange={(value) => setNewCard({ ...newCard, category: value })}
                      >
                        <SelectTrigger id="category" className="border-2 border-amber-200 dark:border-amber-800 focus:border-amber-400 dark:focus:border-amber-600 bg-white/50 dark:bg-black/20 backdrop-blur-sm h-11">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">📚 General</SelectItem>
                          <SelectItem value="math">🔢 Math</SelectItem>
                          <SelectItem value="science">🔬 Science</SelectItem>
                          <SelectItem value="history">📜 History</SelectItem>
                          <SelectItem value="literature">📖 Literature</SelectItem>
                          <SelectItem value="programming">💻 Programming</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="difficulty" className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Difficulty
                      </Label>
                      <Select
                        value={newCard.difficulty}
                        onValueChange={(value) => setNewCard({ ...newCard, difficulty: value })}
                      >
                        <SelectTrigger id="difficulty" className="border-2 border-amber-200 dark:border-amber-800 focus:border-amber-400 dark:focus:border-amber-600 bg-white/50 dark:bg-black/20 backdrop-blur-sm h-11">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">🟢 Easy</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="hard">🔴 Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                </div>
                <DialogFooter className="gap-3 flex-shrink-0 px-6 py-5 border-t bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreatingCard(false)}
                    className="border-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleCreateFlashcard} 
                    disabled={createFlashcardMutation.isPending || !newCard.question || !newCard.answer}
                    className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createFlashcardMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Flashcard
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Flashcard Dialog */}
            <Dialog open={isEditingCard} onOpenChange={setIsEditingCard}>
              <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Pencil className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl">Edit Flashcard</DialogTitle>
                  </div>
                  <DialogDescription>
                    Update your flashcard details below.
                  </DialogDescription>
                </DialogHeader>
                {editingCard && (
                  <div className="grid gap-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
                    <div className="grid gap-3">
                      <Label htmlFor="edit-question" className="text-sm font-medium">Question</Label>
                      <Textarea
                        id="edit-question"
                        value={editingCard.question}
                        onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                        rows={2}
                        placeholder="What is the question?"
                        className="border-2 focus:border-primary resize-none"
                      />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Question Image (Optional)
                        </Label>
                        {editingCard.questionImage ? (
                          <div className="relative">
                            <img
                              src={editingCard.questionImage}
                              alt="Question preview"
                              className="max-w-full max-h-48 rounded-lg object-contain border-2 border-primary/20"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => removeImage('question', true)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="edit-question-image"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, 'question', true);
                                }
                              }}
                              className="border-2"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => document.getElementById('edit-question-image')?.click()}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="edit-answer" className="text-sm font-medium">Answer</Label>
                      <Textarea
                        id="edit-answer"
                        value={editingCard.answer}
                        onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                        rows={4}
                        placeholder="What is the answer?"
                        className="border-2 focus:border-primary resize-none"
                      />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Answer Image (Optional)
                        </Label>
                        {editingCard.answerImage ? (
                          <div className="relative">
                            <img
                              src={editingCard.answerImage}
                              alt="Answer preview"
                              className="max-w-full max-h-48 rounded-lg object-contain border-2 border-primary/20"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => removeImage('answer', true)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="edit-answer-image"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, 'answer', true);
                                }
                              }}
                              className="border-2"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => document.getElementById('edit-answer-image')?.click()}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-category" className="text-sm font-medium">Category</Label>
                        <Select
                          value={editingCard.category}
                          onValueChange={(value) => setEditingCard({ ...editingCard, category: value })}
                        >
                          <SelectTrigger id="edit-category" className="border-2">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">📚 General</SelectItem>
                            <SelectItem value="math">🔢 Math</SelectItem>
                            <SelectItem value="science">🔬 Science</SelectItem>
                            <SelectItem value="history">📜 History</SelectItem>
                            <SelectItem value="literature">📖 Literature</SelectItem>
                            <SelectItem value="programming">💻 Programming</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-difficulty" className="text-sm font-medium">Difficulty</Label>
                        <Select
                          value={editingCard.difficulty}
                          onValueChange={(value) => setEditingCard({ ...editingCard, difficulty: value })}
                        >
                          <SelectTrigger id="edit-difficulty" className="border-2">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">🟢 Easy</SelectItem>
                            <SelectItem value="medium">🟡 Medium</SelectItem>
                            <SelectItem value="hard">🔴 Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="gap-2 flex-shrink-0 px-6 py-4 border-t bg-background">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingCard(false);
                      setEditingCard(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleEditFlashcard} 
                    disabled={updateFlashcardMutation.isPending}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    {updateFlashcardMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        <Tabs defaultValue="study" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 h-auto p-1">
            <TabsTrigger value="study" className="text-sm sm:text-base py-2 sm:py-2.5">
              <Brain className="h-4 w-4 mr-2" />
              Study Mode
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm sm:text-base py-2 sm:py-2.5">
              <BookOpen className="h-4 w-4 mr-2" />
              All Flashcards
            </TabsTrigger>
            <TabsTrigger value="decks" className="text-sm sm:text-base py-2 sm:py-2.5">
              <BookOpen className="h-4 w-4 mr-2" />
              My Decks
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm sm:text-base py-2 sm:py-2.5">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="study" className="space-y-4">
            {isLoadingCards ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-2xl space-y-4">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-96 w-full rounded-lg" />
                  <div className="flex justify-between">
                    <Skeleton className="h-10 w-24 rounded" />
                    <Skeleton className="h-10 w-24 rounded" />
                  </div>
                </div>
              </div>
            ) : filteredFlashcards.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold">No Flashcards Available</h3>
                <p className="text-gray-500">
                  {selectedDeckId 
                    ? "This deck has no flashcards. Add some flashcards to this deck to start studying."
                    : "Create your first flashcard to start studying."}
                </p>
                {selectedDeckId ? (
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setSelectedDeckId(null);
                      setSelectedDeckName(null);
                      setActiveTab("all");
                    }}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    View All Flashcards
                  </Button>
                ) : (
                  <Button className="mt-4" onClick={() => setIsCreatingCard(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Flashcard
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-2xl">
                  {selectedDeckId && selectedDeckName && (
                    <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-primary">Studying Deck: {selectedDeckName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDeckId(null);
                            setSelectedDeckName(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Filter
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                    <span>Card {currentCardIndex + 1} of {filteredFlashcards.length}</span>
                    <div className="flex items-center gap-2">
                      <span>Category: {currentCard?.category}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Keyboard className="h-4 w-4 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold mb-2">Keyboard Shortcuts</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Space</span>
                                  <span>Reveal answer</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">← →</span>
                                  <span>Navigate cards</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">1</span>
                                  <span>Mark incorrect</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">2</span>
                                  <span>Mark correct</span>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <FlipCard
                    question={currentCard?.question || ""}
                    answer={currentCard?.answer || ""}
                    questionImage={currentCard?.questionImage}
                    answerImage={currentCard?.answerImage}
                    category={currentCard?.category}
                    isFlipped={showAnswer}
                    onFlip={() => setShowAnswer(!showAnswer)}
                  />
                  
                  {showAnswer && (
                    <div className="flex justify-center space-x-4 mt-4 p-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        onClick={() => reviewFlashcardMutation.mutate({ id: currentCard.id, correct: false })}
                        disabled={reviewFlashcardMutation.isPending}
                      >
                        <X className="h-4 w-4" /> Incorrect
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                        onClick={() => reviewFlashcardMutation.mutate({ id: currentCard.id, correct: true })}
                        disabled={reviewFlashcardMutation.isPending}
                      >
                        <Check className="h-4 w-4" /> Correct
                      </Button>
                    </div>
                  )}
                  
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
              <FlashcardGridSkeleton count={6} />
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
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredFlashcards.length} flashcard{filteredFlashcards.length !== 1 ? 's' : ''}
                  </div>
                  <ExportDialog>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </ExportDialog>
                </div>
                <VirtualizedFlashcardGrid
                  flashcards={filteredFlashcards}
                  onEdit={openEditDialog}
                  onAddToDeck={setAddingToDeckCardId}
                  onDelete={(id) => deleteFlashcardMutation.mutate(id)}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="decks">
            <DeckManagement
              onStudyDeck={(deckId, deckName) => {
                setSelectedDeckId(deckId);
                setSelectedDeckName(deckName);
                setActiveTab("study");
                toast({
                  title: "Deck loaded",
                  description: `Now studying: ${deckName}`,
                });
              }}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>

        {/* Add to Deck Dialog */}
        <AddToDeckDialog
          open={addingToDeckCardId !== null}
          onOpenChange={(open) => {
            if (!open) setAddingToDeckCardId(null);
          }}
          flashcardId={addingToDeckCardId || 0}
          onSuccess={() => {
            refetch();
          }}
        />
        </div>
      </div>
    </DashboardLayout>
  );
}