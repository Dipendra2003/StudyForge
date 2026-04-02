import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, BookOpen, Pencil, Sparkles, Target, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFlashcardText } from "@/lib/formatText";

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

interface FlashcardDetailModalProps {
  card: Flashcard;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (card: Flashcard) => void;
  onAddToDeck: (cardId: number) => void;
}

export function FlashcardDetailModal({
  card,
  isOpen,
  onClose,
  onEdit,
  onAddToDeck,
}: FlashcardDetailModalProps) {
  // Fetch decks to check if card is already in any deck
  const { data: decksData, isLoading: isLoadingDecks } = useQuery({
    queryKey: ['/api/decks', { flashcardId: card.id }],
    queryFn: async () => {
      const response = await apiRequest<{ decks: Array<{ id: number; name: string; hasFlashcard?: boolean }> }>(`/api/decks?flashcardId=${card.id}`);
      return response.decks || [];
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  // Count how many decks contain this card
  const decksWithCard = decksData?.filter(d => d.hasFlashcard) || [];
  const isInAnyDeck = decksWithCard.length > 0;

  // Get category emoji and color
  const getCategoryStyle = (category: string) => {
    const styles = {
      general: { emoji: "📚", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
      math: { emoji: "🔢", color: "from-purple-500 to-pink-500", bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
      science: { emoji: "🔬", color: "from-green-500 to-emerald-500", bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300" },
      history: { emoji: "📜", color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
      literature: { emoji: "📖", color: "from-rose-500 to-red-500", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300" },
      programming: { emoji: "💻", color: "from-indigo-500 to-blue-500", bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300" },
    };
    return styles[category as keyof typeof styles] || styles.general;
  };

  // Get difficulty badge style
  const getDifficultyStyle = (difficulty: string) => {
    const styles = {
      easy: { label: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "🟢" },
      medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: "🟡" },
      hard: { label: "Hard", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: "🔴" },
    };
    return styles[difficulty as keyof typeof styles] || styles.medium;
  };

  const categoryStyle = getCategoryStyle(card.category);
  const difficultyStyle = getDifficultyStyle(card.difficulty);

  // Handle download
  const handleDownload = () => {
    const content = `Question: ${card.question}\n\nAnswer: ${card.answer}\n\nCategory: ${card.category}\nDifficulty: ${card.difficulty}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcard-${card.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle share
  const handleShare = async () => {
    const shareData = {
      title: "Flashcard",
      text: `Q: ${card.question}\n\nA: ${card.answer}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Share cancelled or failed silently
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.text);
      alert("Flashcard copied to clipboard!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={cn("h-2 bg-gradient-to-r", categoryStyle.color)} />
        
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
          <DialogTitle className="sr-only">Flashcard Details</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
          {/* Tags Section */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full",
              categoryStyle.bg,
              "border",
              categoryStyle.border
            )}>
              <span className="text-base">{categoryStyle.emoji}</span>
              <span className="capitalize">{card.category}</span>
            </span>
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full",
              difficultyStyle.color
            )}>
              <Target className="h-4 w-4" />
              {difficultyStyle.label}
            </span>
            {card.nextReviewDate && (
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-4 w-4" />
                Review: {new Date(card.nextReviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Question Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Question
              </h2>
            </div>
            
            {card.questionImage && (
              <div className="mb-4 flex justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <img
                  src={card.questionImage}
                  alt="Question visual"
                  className="max-w-full max-h-64 rounded-lg object-contain shadow-md"
                />
              </div>
            )}
            
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <p className="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {formatFlashcardText(card.question)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-900 px-4 text-sm font-medium text-gray-500">
                Answer
              </span>
            </div>
          </div>

          {/* Answer Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Answer
              </h2>
            </div>
            
            {card.answerImage && (
              <div className="mb-4 flex justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <img
                  src={card.answerImage}
                  alt="Answer visual"
                  className="max-w-full max-h-64 rounded-lg object-contain shadow-md"
                />
              </div>
            )}
            
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <p className="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {formatFlashcardText(card.answer)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/20 dark:hover:border-blue-700 transition-all text-xs sm:text-sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-2 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/20 dark:hover:border-purple-700 transition-all text-xs sm:text-sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full border-2 transition-all text-xs sm:text-sm",
                isInAnyDeck 
                  ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/20 dark:border-green-700 dark:text-green-400 cursor-default"
                  : "hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/20 dark:hover:border-green-700"
              )}
              onClick={() => {
                if (!isInAnyDeck) {
                  onAddToDeck(card.id);
                  onClose();
                }
              }}
              disabled={isLoadingDecks}
            >
              {isLoadingDecks ? (
                <>
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Checking...</span>
                </>
              ) : isInAnyDeck ? (
                <>
                  <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    In {decksWithCard.length} Deck{decksWithCard.length > 1 ? 's' : ''}
                  </span>
                  <span className="sm:hidden">✓ Added</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add to Deck</span>
                  <span className="sm:hidden">Add</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-2 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950/20 dark:hover:border-amber-700 transition-all text-xs sm:text-sm"
              onClick={() => {
                onEdit(card);
                onClose();
              }}
            >
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
