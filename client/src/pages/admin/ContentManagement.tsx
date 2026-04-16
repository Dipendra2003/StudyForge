import React, { useState } from 'react';
import { useContent } from '@/hooks/useAdminQuery';
import { useUpdateContent, useDeleteContent } from '@/hooks/useAdminMutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { ContentType } from '@/hooks/useAdminQuery';
import {
  exportQuizzesToCSV,
  exportFlashcardsToCSV,
  exportDocumentsToCSV,
  exportQuestionsToCSV,
} from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';

// Types
interface ContentItem {
  id: number;
  userId: number;
  creatorUsername: string;
  title?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuizContent extends ContentItem {
  totalQuestions: number;
  difficulty: string;
  usageCount: number;
}

interface FlashcardContent extends ContentItem {
  question: string;
  answer: string;
  difficulty: string;
}

interface DocumentContent extends ContentItem {
  title: string;
  fileType?: string;
  status: string;
}

interface QuestionContent extends ContentItem {
  type: string;
  question: string;
  difficulty: string;
  usageCount: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState<ContentType>('quizzes');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and moderate user-generated content
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-6">
          <ContentTable type="quizzes" />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          <ContentTable type="flashcards" />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <ContentTable type="documents" />
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <ContentTable type="questions" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Content table component
interface ContentTableProps {
  type: ContentType;
}

function ContentTable({ type }: ContentTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContent, setViewingContent] = useState<any | null>(null);
  const [editingContent, setEditingContent] = useState<any | null>(null);
  const [deletingContent, setDeletingContent] = useState<any | null>(null);
  const { toast } = useToast();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch content with pagination and search
  const { data, isLoading, error } = useContent(type, {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const items = (data as any)?.data?.items || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle CSV export
  const handleExport = () => {
    if (items.length === 0) {
      toast({
        title: 'No data to export',
        description: `There are no ${type} to export.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}-export-${timestamp}.csv`;
      
      switch (type) {
        case 'quizzes':
          exportQuizzesToCSV(items, filename);
          break;
        case 'flashcards':
          exportFlashcardsToCSV(items, filename);
          break;
        case 'documents':
          exportDocumentsToCSV(items, filename);
          break;
        case 'questions':
          exportQuestionsToCSV(items, filename);
          break;
      }
      
      toast({
        title: 'Export successful',
        description: `Exported ${items.length} ${type} to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: `Failed to export ${type}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by title or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || items.length === 0}
            title="Export to CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Label htmlFor={`page-size-${type}`} className="text-sm text-gray-600 dark:text-gray-400">
            Show:
          </Label>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger id={`page-size-${type}`} className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load content. Please try again.
          </p>
        </div>
      )}

      {/* Content table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No content found matching your search.' : 'No content found.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  type={type}
                  onView={() => setViewingContent(item)}
                  onEdit={() => setEditingContent(item)}
                  onDelete={() => setDeletingContent(item)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* View content dialog */}
      {viewingContent && (
        <ContentDetailDialog
          content={viewingContent}
          type={type}
          open={!!viewingContent}
          onClose={() => setViewingContent(null)}
        />
      )}

      {/* Edit content dialog */}
      {editingContent && (
        <ContentEditDialog
          content={editingContent}
          type={type}
          open={!!editingContent}
          onClose={() => setEditingContent(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingContent && (
        <ContentDeleteDialog
          content={deletingContent}
          type={type}
          open={!!deletingContent}
          onClose={() => setDeletingContent(null)}
        />
      )}
    </div>
  );
}

// Content row component
interface ContentRowProps {
  item: any;
  type: ContentType;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ContentRow({ item, type, onView, onEdit, onDelete }: ContentRowProps) {
  const getTitle = () => {
    if (type === 'quizzes') return item.title || `Quiz #${item.id}`;
    if (type === 'flashcards') return item.question?.substring(0, 50) || `Flashcard #${item.id}`;
    if (type === 'documents') return item.title || `Document #${item.id}`;
    if (type === 'questions') return item.question?.substring(0, 50) || `Question #${item.id}`;
    return `Item #${item.id}`;
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{item.id}</TableCell>
      <TableCell className="font-medium max-w-xs truncate">{getTitle()}</TableCell>
      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
        {item.creatorUsername || 'Unknown'}
      </TableCell>
      <TableCell className="text-sm">{item.category || 'N/A'}</TableCell>
      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
        {new Date(item.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit content"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete content"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Content detail dialog component
interface ContentDetailDialogProps {
  content: any;
  type: ContentType;
  open: boolean;
  onClose: () => void;
}

function ContentDetailDialog({ content, type, open, onClose }: ContentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Details</DialogTitle>
          <DialogDescription>
            View full details for this {type.slice(0, -1)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">ID</Label>
              <p className="font-mono text-sm">{content.id}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Creator</Label>
              <p className="text-sm">{content.creatorUsername || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <p className="text-sm">{content.category || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Created</Label>
              <p className="text-sm">{new Date(content.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Type-specific content */}
          {type === 'quizzes' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Title</Label>
                <p className="text-sm">{content.title || 'Untitled Quiz'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Questions</Label>
                  <p className="text-sm font-semibold">{content.totalQuestions || 0}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Difficulty</Label>
                  <p className="text-sm">{content.difficulty || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Usage Count</Label>
                  <p className="text-sm font-semibold">{content.usageCount || 0}</p>
                </div>
              </div>
            </div>
          )}

          {type === 'flashcards' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Question</Label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {content.question || 'No question'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Answer</Label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {content.answer || 'No answer'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Difficulty</Label>
                <p className="text-sm">{content.difficulty || 'N/A'}</p>
              </div>
            </div>
          )}

          {type === 'documents' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Title</Label>
                <p className="text-sm">{content.title || 'Untitled Document'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">File Type</Label>
                  <p className="text-sm">{content.fileType || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <p className="text-sm">{content.status || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {type === 'questions' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Question</Label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {content.question || 'No question'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <p className="text-sm">{content.type || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Difficulty</Label>
                  <p className="text-sm">{content.difficulty || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Usage Count</Label>
                  <p className="text-sm font-semibold">{content.usageCount || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Content edit dialog component
interface ContentEditDialogProps {
  content: any;
  type: ContentType;
  open: boolean;
  onClose: () => void;
}

function ContentEditDialog({ content, type, open, onClose }: ContentEditDialogProps) {
  const [formData, setFormData] = useState<any>({
    title: content.title || '',
    category: content.category || '',
    question: content.question || '',
    answer: content.answer || '',
    difficulty: content.difficulty || '',
  });

  const updateContent = useUpdateContent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build updates object based on content type
    const updates: any = {};
    if (type === 'quizzes') {
      if (formData.title) updates.title = formData.title;
      if (formData.category) updates.category = formData.category;
      if (formData.difficulty) updates.difficulty = formData.difficulty;
    } else if (type === 'flashcards') {
      if (formData.question) updates.question = formData.question;
      if (formData.answer) updates.answer = formData.answer;
      if (formData.category) updates.category = formData.category;
      if (formData.difficulty) updates.difficulty = formData.difficulty;
    } else if (type === 'documents') {
      if (formData.title) updates.title = formData.title;
      if (formData.category) updates.category = formData.category;
    } else if (type === 'questions') {
      if (formData.question) updates.question = formData.question;
      if (formData.category) updates.category = formData.category;
      if (formData.difficulty) updates.difficulty = formData.difficulty;
    }

    updateContent.mutate(
      {
        type,
        id: content.id,
        updates,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Modify the content details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common fields */}
          {(type === 'quizzes' || type === 'documents') && (
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter title"
              />
            </div>
          )}

          {(type === 'flashcards' || type === 'questions') && (
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter question"
                rows={3}
              />
            </div>
          )}

          {type === 'flashcards' && (
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter answer"
                rows={3}
              />
            </div>
          )}

          {type !== 'documents' && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Enter category"
              />
            </div>
          )}

          {type !== 'documents' && (
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
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
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateContent.isPending}>
              {updateContent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Content delete confirmation dialog
interface ContentDeleteDialogProps {
  content: any;
  type: ContentType;
  open: boolean;
  onClose: () => void;
}

function ContentDeleteDialog({ content, type, open, onClose }: ContentDeleteDialogProps) {
  const deleteContent = useDeleteContent();

  const handleDelete = () => {
    deleteContent.mutate(
      { type, id: content.id },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const getContentName = () => {
    if (type === 'quizzes') return content.title || `Quiz #${content.id}`;
    if (type === 'flashcards') return `Flashcard #${content.id}`;
    if (type === 'documents') return content.title || `Document #${content.id}`;
    if (type === 'questions') return `Question #${content.id}`;
    return `Item #${content.id}`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Content</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete <strong>{getContentName()}</strong>?
            This action cannot be undone and will remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteContent.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteContent.isPending ? 'Deleting...' : 'Delete Content'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
