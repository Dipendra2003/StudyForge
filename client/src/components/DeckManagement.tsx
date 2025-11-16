import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DeckCard } from "@/components/DeckCard";
import { Plus, Loader2, FolderPlus, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface Deck {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
}

interface DeckManagementProps {
  onStudyDeck?: (deckId: number, deckName: string) => void;
}

export function DeckManagement({ onStudyDeck }: DeckManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeckId, setDeletingDeckId] = useState<number | null>(null);
  const [newDeck, setNewDeck] = useState({
    name: "",
    description: "",
  });

  const { toast } = useToast();

  // Fetch all decks
  const { data: decks, isLoading, refetch } = useQuery({
    queryKey: ['/api/decks'],
    queryFn: async () => {
      const response = await apiRequest<{ decks: Deck[] }>('/api/decks');
      return response.decks || [];
    }
  });

  // Create deck mutation
  const createDeckMutation = useMutation({
    mutationFn: async (deckData: { name: string; description?: string }) => {
      return apiRequest<Deck>('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deckData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Deck created",
        description: "Your deck has been created successfully.",
      });
      setNewDeck({ name: "", description: "" });
      setIsCreating(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating deck",
        description: "There was an error creating your deck. Please try again.",
        variant: "destructive",
      });
      console.error("Create deck error:", error);
    },
  });

  // Update deck mutation
  const updateDeckMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Deck> }) => {
      return apiRequest<Deck>(`/api/decks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Deck updated",
        description: "Your deck has been updated successfully.",
      });
      setEditingDeck(null);
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error updating deck",
        description: "There was an error updating your deck. Please try again.",
        variant: "destructive",
      });
      console.error("Update deck error:", error);
    },
  });

  // Delete deck mutation
  const deleteDeckMutation = useMutation({
    mutationFn: async (deckId: number) => {
      return apiRequest(`/api/decks/${deckId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Deck deleted",
        description: "Your deck has been deleted successfully.",
      });
      setDeletingDeckId(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error deleting deck",
        description: "There was an error deleting your deck. Please try again.",
        variant: "destructive",
      });
      console.error("Delete deck error:", error);
    },
  });

  const handleCreateDeck = () => {
    if (!newDeck.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a deck name.",
        variant: "destructive",
      });
      return;
    }

    createDeckMutation.mutate({
      name: newDeck.name.trim(),
      description: newDeck.description.trim() || undefined,
    });
  };

  const handleEditDeck = () => {
    if (!editingDeck) return;

    if (!editingDeck.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a deck name.",
        variant: "destructive",
      });
      return;
    }

    updateDeckMutation.mutate({
      id: editingDeck.id,
      data: {
        name: editingDeck.name.trim(),
        description: editingDeck.description?.trim() || undefined,
      },
    });
  };

  const openEditDialog = (deck: Deck) => {
    setEditingDeck({ ...deck });
    setIsEditing(true);
  };

  const handleDeleteDeck = (deckId: number) => {
    setDeletingDeckId(deckId);
  };

  const confirmDelete = () => {
    if (deletingDeckId) {
      deleteDeckMutation.mutate(deletingDeckId);
    }
  };

  const handleStudyDeck = (deckId: number, deckName: string) => {
    if (onStudyDeck) {
      onStudyDeck(deckId, deckName);
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Deck management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" id="decks-heading">My Decks</h2>
          <p className="text-sm text-muted-foreground">
            Organize your flashcards into decks for focused study sessions
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              aria-label="Create new deck"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Deck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" aria-describedby="create-deck-description">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10" aria-hidden="true">
                  <FolderPlus className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-xl">Create New Deck</DialogTitle>
              </div>
              <DialogDescription id="create-deck-description">
                Create a new deck to organize your flashcards by topic or subject.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="deck-name" className="text-sm font-medium">
                  Deck Name *
                </Label>
                <Input
                  id="deck-name"
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                  placeholder="e.g., Biology Chapter 5"
                  className="border-2 focus:border-primary"
                  aria-required="true"
                  aria-label="Deck name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deck-description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="deck-description"
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                  placeholder="Add a description for this deck..."
                  rows={3}
                  className="border-2 focus:border-primary resize-none"
                  aria-label="Deck description"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewDeck({ name: "", description: "" });
                }}
                aria-label="Cancel deck creation"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateDeck}
                disabled={createDeckMutation.isPending}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                aria-label={createDeckMutation.isPending ? "Creating deck" : "Create deck"}
              >
                {createDeckMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create Deck
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Deck Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Edit Deck</DialogTitle>
            </div>
            <DialogDescription>
              Update your deck name and description.
            </DialogDescription>
          </DialogHeader>
          {editingDeck && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-deck-name" className="text-sm font-medium">
                  Deck Name *
                </Label>
                <Input
                  id="edit-deck-name"
                  value={editingDeck.name}
                  onChange={(e) => setEditingDeck({ ...editingDeck, name: e.target.value })}
                  placeholder="e.g., Biology Chapter 5"
                  className="border-2 focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-deck-description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="edit-deck-description"
                  value={editingDeck.description || ""}
                  onChange={(e) => setEditingDeck({ ...editingDeck, description: e.target.value })}
                  placeholder="Add a description for this deck..."
                  rows={3}
                  className="border-2 focus:border-primary resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditingDeck(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditDeck}
              disabled={updateDeckMutation.isPending}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {updateDeckMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingDeckId !== null} onOpenChange={() => setDeletingDeckId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this deck. The flashcards in this deck will not be deleted,
              but they will be removed from this deck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Deck
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-lg border border-gray-200 space-y-3">
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
              <div className="flex justify-between items-center pt-4">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !decks || decks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Decks Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first deck to organize your flashcards
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Deck
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={openEditDialog}
              onDelete={handleDeleteDeck}
              onStudy={handleStudyDeck}
            />
          ))}
        </div>
      )}
    </div>
  );
}
