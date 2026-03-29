import { useState, useEffect } from "react";
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
import { Pencil, Loader2 } from "lucide-react";

interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
}

interface EditStudyItemDialogProps {
  planId: number;
  item: StudyPlanItem;
  onEdit: (planId: number, itemId: string, data: { title: string; description: string; duration: number }) => void;
  isEditing: boolean;
}

export function EditStudyItemDialog({ planId, item, onEdit, isEditing }: EditStudyItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: item.title,
    description: item.description,
    duration: item.duration,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: item.title,
        description: item.description,
        duration: item.duration,
      });
    }
  }, [open, item]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    onEdit(planId, item.id, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Study Item</DialogTitle>
          <DialogDescription>
            Update the details of this study task.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-item-title">Title</Label>
            <Input
              id="edit-item-title"
              placeholder="e.g., Learn Python basics"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-item-description">Description</Label>
            <Textarea
              id="edit-item-description"
              placeholder="Brief description of what to study..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-item-duration">Duration (minutes)</Label>
            <Input
              id="edit-item-duration"
              type="number"
              min="5"
              max="480"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
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
            disabled={isEditing || !formData.title.trim()}
          >
            {isEditing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
