import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Loader2 } from "lucide-react";

interface AddStudyItemDialogProps {
  planId: number;
  onAdd: (planId: number, item: { title: string; description: string; duration: number }) => void;
  isAdding: boolean;
}

export function AddStudyItemDialog({ planId, onAdd, isAdding }: AddStudyItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState({
    title: "",
    description: "",
    duration: 60,
  });

  const handleSubmit = () => {
    if (!item.title.trim()) return;
    
    onAdd(planId, item);
    setItem({ title: "", description: "", duration: 60 });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Item Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Study Item</DialogTitle>
          <DialogDescription>
            Add a new task or topic to your study plan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              placeholder="e.g., Learn Python basics"
              value={item.title}
              onChange={(e) => setItem({ ...item, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-description">Description (optional)</Label>
            <Textarea
              id="item-description"
              placeholder="Brief description of what to study..."
              value={item.description}
              onChange={(e) => setItem({ ...item, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-duration">Duration (minutes)</Label>
            <Input
              id="item-duration"
              type="number"
              min="5"
              max="480"
              value={item.duration}
              onChange={(e) => setItem({ ...item, duration: parseInt(e.target.value) || 60 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isAdding || !item.title.trim()}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
