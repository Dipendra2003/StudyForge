import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Save, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GeneratedFlashcard {
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  tags?: string[];
}

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number | null;
  documentText: string;
  onSuccess?: () => void;
}

export function BulkGenerateDialog({
  open,
  onOpenChange,
  documentId,
  documentText,
  onSuccess,
}: BulkGenerateDialogProps) {
  const [count, setCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [generatedCards, setGeneratedCards] = useState<GeneratedFlashcard[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GeneratedFlashcard | null>(null);
  const { toast } = useToast();

  // Generate flashcards mutation
  const generateMutation = useMutation({
    mutationFn: async ({ documentId, text, count, difficulty }: { documentId: number | null; text: string; count: number; difficulty: string }) => {
      // If documentId is available, use document-based endpoint
      if (documentId) {
        return apiRequest<{ flashcards: GeneratedFlashcard[] }>(`/api/documents/${documentId}/generate-flashcards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ count, difficulty }),
        });
      } else {
        // Otherwise, use text-based endpoint
        return apiRequest<{ flashcards: GeneratedFlashcard[] }>('/api/flashcards/generate-from-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, count, difficulty }),
        });
      }
    },
    onSuccess: (data) => {
      setGeneratedCards(data.flashcards || []);
      toast({
        title: "Flashcards generated",
        description: `Successfully generated ${data.flashcards?.length || 0} flashcards.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "There was an error generating flashcards.";
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });

    },
  });

  // Save all flashcards mutation
  const saveMutation = useMutation({
    mutationFn: async ({ flashcards, documentId }: { flashcards: GeneratedFlashcard[]; documentId: number | null }) => {
      return apiRequest<{ flashcards: any[]; count: number }>('/api/flashcards/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcards, documentId: documentId || null }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Flashcards saved",
        description: `Successfully created ${data.count} flashcards.`,
      });
      setGeneratedCards([]);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "There was an error saving flashcards.";
      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      });

    },
  });

  const handleGenerate = () => {
    if (!documentText || documentText.trim().length < 50) {
      toast({
        title: "Document too short",
        description: "The document needs at least 50 characters to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({ documentId, text: documentText, count, difficulty });
  };

  const handleSaveAll = () => {
    if (generatedCards.length === 0) {
      toast({
        title: "No cards to save",
        description: "Generate flashcards first before saving.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ flashcards: generatedCards, documentId });
  };

  const handleRemoveCard = (index: number) => {
    setGeneratedCards(generatedCards.filter((_, i) => i !== index));
    toast({
      title: "Card removed",
      description: "The flashcard has been removed from the list.",
    });
  };

  const handleEditCard = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...generatedCards[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updatedCards = [...generatedCards];
      updatedCards[editingIndex] = editForm;
      setGeneratedCards(updatedCards);
      setEditingIndex(null);
      setEditForm(null);
      toast({
        title: "Card updated",
        description: "The flashcard has been updated successfully.",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleClose = () => {
    setGeneratedCards([]);
    setEditingIndex(null);
    setEditForm(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <DialogTitle className="text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Generate Flashcards
            </DialogTitle>
          </div>
          <DialogDescription>
            Use AI to automatically generate flashcards from your document.
          </DialogDescription>
        </DialogHeader>

        {generatedCards.length === 0 ? (
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label htmlFor="count-slider" className="text-sm font-medium">
                Number of Cards: {count}
              </Label>
              <Slider
                id="count-slider"
                min={5}
                max={20}
                step={1}
                value={[count]}
                onValueChange={(value) => setCount(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Generate between 5 and 20 flashcards
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="difficulty-select" className="text-sm font-medium">
                Difficulty Level
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty-select" className="border-2">
                  <SelectValue placeholder="Select difficulty..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Simple concepts and definitions</SelectItem>
                  <SelectItem value="medium">Medium - Balanced complexity</SelectItem>
                  <SelectItem value="hard">Hard - Advanced concepts and analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 text-white"
              size="lg"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Flashcards...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Flashcards
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium">
                  {generatedCards.length} flashcards generated
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedCards([])}
              >
                Generate New
              </Button>
            </div>

            {editingIndex !== null && editForm ? (
              <div className="border-2 border-violet-200 rounded-lg p-4 bg-violet-50/50 space-y-4">
                <h3 className="font-semibold text-sm">Edit Flashcard</h3>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="edit-question" className="text-sm">Question</Label>
                    <Textarea
                      id="edit-question"
                      value={editForm.question}
                      onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-answer" className="text-sm">Answer</Label>
                    <Textarea
                      id="edit-answer"
                      value={editForm.answer}
                      onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-category" className="text-sm">Category</Label>
                      <Input
                        id="edit-category"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-difficulty" className="text-sm">Difficulty</Label>
                      <Select
                        value={editForm.difficulty}
                        onValueChange={(value) => setEditForm({ ...editForm, difficulty: value })}
                      >
                        <SelectTrigger id="edit-difficulty" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead className="w-[40%]">Answer</TableHead>
                    <TableHead className="w-[10%]">Difficulty</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedCards.map((card, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-sm">
                        {card.question.length > 100
                          ? `${card.question.substring(0, 100)}...`
                          : card.question}
                      </TableCell>
                      <TableCell className="text-sm">
                        {card.answer.length > 100
                          ? `${card.answer.substring(0, 100)}...`
                          : card.answer}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          card.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {card.difficulty}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCard(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCard(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          {generatedCards.length > 0 && (
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All ({generatedCards.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
