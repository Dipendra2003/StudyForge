import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderPlus, Check, CheckCircle2 } from "lucide-react";

interface Deck {
  id: number;
  name: string;
  description?: string | null;
  cardCount: number;
  hasFlashcard?: boolean;
}

interface AddToDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: number;
  onSuccess?: () => void;
}

export function AddToDeckDialog({ open, onOpenChange, flashcardId, onSuccess }: AddToDeckDialogProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all decks with flashcard membership info
  const { data: decks, isLoading: isLoadingDecks } = useQuery({
    queryKey: ['/api/decks', { flashcardId }],
    queryFn: async () => {
      const response = await apiRequest<{ decks: Deck[] }>(`/api/decks?flashcardId=${flashcardId}`);
      return response.decks || [];
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Add card to deck mutation
  const addToDeckMutation = useMutation({
    mutationFn: async ({ deckId, flashcardId }: { deckId: number; flashcardId: number }) => {
      return apiRequest(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcardId }),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch decks to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/decks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards'] });
      
      toast({
        title: "Card added to deck",
        description: "Your flashcard has been added to the deck successfully.",
      });
      setSelectedDeckId("");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "There was an error adding the card to the deck.";
      toast({
        title: "Error adding card",
        description: errorMessage,
        variant: "destructive",
      });

    },
  });

  const handleAddToDeck = () => {
    if (!selectedDeckId) {
      toast({
        title: "No deck selected",
        description: "Please select a deck to add this card to.",
        variant: "destructive",
      });
      return;
    }

    addToDeckMutation.mutate({
      deckId: parseInt(selectedDeckId),
      flashcardId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" aria-describedby="add-to-deck-description">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10" aria-hidden="true">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Add to Deck</DialogTitle>
          </div>
          <DialogDescription id="add-to-deck-description">
            Select a deck to add this flashcard to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoadingDecks ? (
            <div className="flex justify-center items-center py-8" role="status" aria-label="Loading decks">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : !decks || decks.length === 0 ? (
            <div className="text-center py-4" role="status">
              <p className="text-sm text-muted-foreground mb-2">
                You don't have any decks yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Create a deck first from the "My Decks" tab.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="deck-select" className="text-sm font-medium">
                Select Deck
              </Label>
              <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                <SelectTrigger id="deck-select" className="border-2" aria-label="Select a deck">
                  <SelectValue placeholder="Choose a deck..." />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((deck) => (
                    <SelectItem 
                      key={deck.id} 
                      value={deck.id.toString()}
                      disabled={deck.hasFlashcard}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className={deck.hasFlashcard ? "text-muted-foreground" : ""}>
                          {deck.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {deck.hasFlashcard && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({deck.cardCount} cards)
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedDeckId("");
              onOpenChange(false);
            }}
            aria-label="Cancel adding to deck"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddToDeck}
            disabled={addToDeckMutation.isPending || !selectedDeckId || !decks || decks.length === 0}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            aria-label={addToDeckMutation.isPending ? "Adding flashcard to deck" : "Add flashcard to selected deck"}
          >
            {addToDeckMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Adding...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Add to Deck
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
