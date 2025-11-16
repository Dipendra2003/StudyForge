import { memo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Sparkles, Target, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatFlashcardText } from "@/lib/formatText";
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
import { FlashcardDetailModal } from "@/components/FlashcardDetailModal";

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

interface FlashcardCardProps {
  card: Flashcard;
  onEdit: (card: Flashcard) => void;
  onAddToDeck: (cardId: number) => void;
  onDelete: (cardId: number) => void;
}

export const FlashcardCard = memo(({ card, onEdit, onAddToDeck, onDelete }: FlashcardCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Get category emoji and color
  const getCategoryStyle = (category: string) => {
    const styles = {
      general: { emoji: "📚", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800" },
      math: { emoji: "🔢", color: "from-purple-500 to-pink-500", bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800" },
      science: { emoji: "🔬", color: "from-green-500 to-emerald-500", bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800" },
      history: { emoji: "📜", color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800" },
      literature: { emoji: "📖", color: "from-rose-500 to-red-500", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800" },
      programming: { emoji: "💻", color: "from-indigo-500 to-blue-500", bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800" },
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={cn(
            "h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
            "border-2 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
            categoryStyle.border
          )}
          role="article" 
          aria-label={`Flashcard: ${card.question.substring(0, 50)}${card.question.length > 50 ? '...' : ''}`}
        >
          {/* Gradient Header Bar */}
          <div className={cn("h-1.5 bg-gradient-to-r", categoryStyle.color)} />
          
          <CardHeader className="pb-3 pt-4">
            <div className="flex justify-between items-start gap-2">
              {/* Category & Difficulty Badges */}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Flashcard metadata">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full",
                  categoryStyle.bg,
                  "border",
                  categoryStyle.border
                )}>
                  <span className="text-sm">{categoryStyle.emoji}</span>
                  <span className="capitalize">{card.category}</span>
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full",
                  difficultyStyle.color
                )}>
                  <Target className="h-3 w-3" />
                  {difficultyStyle.label}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-all"
                  onClick={() => onEdit(card)}
                  aria-label="Edit flashcard"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-all"
                  onClick={() => setShowDeleteDialog(true)}
                  aria-label="Delete flashcard"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-4">
            {/* Question Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Question
                </h3>
              </div>
              
              {card.questionImage && (
                <div className="flex justify-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <img
                    src={card.questionImage}
                    alt="Question visual"
                    loading="lazy"
                    className="max-w-full max-h-32 rounded-md object-contain"
                  />
                </div>
              )}
              
              <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-3">
                {formatFlashcardText(card.question)}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 pt-3 pb-4 bg-gray-50/50 dark:bg-gray-800/30 border-t">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all font-medium shadow-md hover:shadow-lg"
              onClick={() => setShowDetailModal(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
            
            {/* Metadata Footer */}
            <div className="flex justify-between w-full text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(card.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              {card.nextReviewDate && (
                <div className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>Review: {new Date(card.nextReviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-700">
                  <strong>Q:</strong> {card.question.substring(0, 100)}
                  {card.question.length > 100 ? '...' : ''}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(card.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FlashcardDetailModal
        card={card}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={onEdit}
        onAddToDeck={onAddToDeck}
        onDelete={() => {
          setShowDetailModal(false);
          setShowDeleteDialog(true);
        }}
      />
    </>
  );
});

FlashcardCard.displayName = "FlashcardCard";
