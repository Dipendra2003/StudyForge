import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Pencil, Trash2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DeckCardProps {
  deck: {
    id: number;
    name: string;
    description?: string | null;
    cardCount: number;
    updatedAt: string;
  };
  onEdit: (deck: any) => void;
  onDelete: (deckId: number) => void;
  onStudy: (deckId: number, deckName: string) => void;
}

export function DeckCard({ deck, onEdit, onDelete, onStudy }: DeckCardProps) {
  const lastStudied = new Date(deck.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "h-full border-2 hover:border-primary/50 transition-all cursor-pointer",
        "bg-gradient-to-br from-background to-primary/5"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg truncate">{deck.name}</h3>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(deck);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(deck.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {deck.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {deck.description}
            </p>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary">{deck.cardCount}</span>
              <span className="text-muted-foreground">
                {deck.cardCount === 1 ? 'card' : 'cards'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Updated {lastStudied}
            </span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={(e) => {
              e.stopPropagation();
              onStudy(deck.id, deck.name);
            }}
            disabled={deck.cardCount === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Study Deck
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
