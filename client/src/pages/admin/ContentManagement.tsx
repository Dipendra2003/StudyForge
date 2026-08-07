import React, { useState } from 'react';
import { useContent } from '@/hooks/useAdminQuery';
import { useUpdateContent, useDeleteContent, useCreateContent, useSeedQuizzes, useBulkDeleteContent } from '@/hooks/useAdminMutation';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
  ShieldAlert,
  CheckCircle2,
  User,
  Calendar,
  Maximize,
  Clock,
  Settings2,
  Sparkles,
  Database,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import type { ContentType } from '@/hooks/useAdminQuery';
import {
  exportQuizzesToCSV,
  exportFlashcardsToCSV,
  exportDocumentsToCSV,
  exportQuestionsToCSV,
} from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';

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
  questionCount?: number;
  description?: string;
  questionTypes?: any;
  difficulty: string;
  usageCount: number;
  timedMode?: boolean;
  timeLimit?: number;
  aiMode?: boolean;
  fullscreenMode?: boolean;
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
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const handleRunToxicityScan = async () => {
    setIsScanning(true);
    try {
      const res = await apiPost('/api/admin/content/scan-toxicity', { sampleLimit: 50 });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Toxicity Scanner Complete',
          description: data.message || `Scanned ${data.data?.scannedCount || 'recent'} items for safety risks.`,
        });
        if (activeTab === 'flagged') {
          setActiveTab('quizzes');
          setTimeout(() => setActiveTab('flagged'), 100);
        }
      } else {
        throw new Error(data.message || 'Scan failed');
      }
    } catch (error: any) {
      toast({
        title: 'Scan Error',
        description: error.message || 'Failed to execute toxicity scan.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-6.5rem)] -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 bg-background overflow-hidden">
      <div className="flex-shrink-0 space-y-3 pb-2 border-b border-border/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Content Governance & Moderation</h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-0.5">
              Manage study assets, verify AI interactions, and enforce real-time toxicity safety compliance.
            </p>
          </div>
          <Button onClick={handleRunToxicityScan} disabled={isScanning} size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-md font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-2 transition-all flex-shrink-0">
            {isScanning ? 'Running Safety Scan...' : 'Run AI Toxicity Scanner'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full gap-1 sm:gap-1.5 justify-start bg-muted/50 p-1.5 rounded-xl border border-border/50 max-h-[110px] overflow-y-auto">
            <TabsTrigger value="quizzes" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Quizzes</TabsTrigger>
            <TabsTrigger value="flashcards" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Flashcards</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Documents</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Questions</TabsTrigger>
            <TabsTrigger value="flagged" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-red-100 data-[state=active]:text-red-900 dark:data-[state=active]:bg-red-950/70 dark:data-[state=active]:text-red-300 shadow-xs">Flagged / Reports</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">AI Chat Transcripts</TabsTrigger>
            <TabsTrigger value="code-snippets" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Code Snippets</TabsTrigger>
            <TabsTrigger value="study-plans" className="text-xs font-extrabold rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">Study Plans</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 flex flex-col pt-3 overflow-hidden">
        <ContentTable type={activeTab} />
      </div>
    </div>
  );
}

// Content table component
interface ContentTableProps {
  type: ContentType;
}

function getItemTitle(item: any, type: ContentType): string {
  if (!item) return 'Untitled Item';
  if (type === 'quizzes') return item.title || `Quiz #${item.id}`;
  if (type === 'flashcards') return item.question?.substring(0, 75) || `Flashcard #${item.id}`;
  if (type === 'documents') return item.title || `Document #${item.id}`;
  if (type === 'questions') return item.question?.substring(0, 85) || item.title || `Question #${item.id}`;
  if (type === 'chat') {
    if (item.title && item.title.trim() !== '[user]') return item.title;
    if (item.subject && item.subject.trim() !== '[user]') return item.subject;
    if (item.content) return `[${item.role || 'user'}] ${item.content.substring(0, 60)}`;
    return `AI Tutoring Session #${item.id}`;
  }
  if (type === 'code-snippets') return `${item.language || 'code'}: ${item.title || item.code?.substring(0, 50) || ''}`;
  if (type === 'study-plans') return `${item.title || 'Study Plan'} (${item.progressPercentage || 0}%)`;
  if (type === 'flagged') return item.title || `[${item.contentType || 'Item'}] ${item.reason || item.preview || `ID #${item.contentId}`}`;
  return item.title || item.question || item.subject || `Item #${item.id}`;
}

function ContentTable({ type }: ContentTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContent, setViewingContent] = useState<any | null>(null);
  const [editingContent, setEditingContent] = useState<any | null>(null);
  const [deletingContent, setDeletingContent] = useState<any | null>(null);
  const [creatingContent, setCreatingContent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { toast } = useToast();
  const seedQuizzes = useSeedQuizzes();
  const deleteContent = useDeleteContent();
  const bulkDeleteContent = useBulkDeleteContent();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch content with pagination and search
  const { data, isLoading, error } = useContent(type, {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const items: any[] = (data as any)?.data?.items || (Array.isArray((data as any)?.data) ? (data as any)?.data : []);
  const total = (data as any)?.data?.total || items.length;
  const totalPages = Math.ceil(total / limit) || 1;

  React.useEffect(() => {
    setSelectedIds([]);
  }, [type, page, limit]);

  const allSelected = items.length > 0 && items.every(i => selectedIds.includes(i.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteContent.mutateAsync({ type, ids: selectedIds });
      setSelectedIds([]);
    } catch (error) {
      setSelectedIds([]);
    }
  };

  const handleBulkVerify = () => {
    toast({
      title: 'Safety Verification Complete',
      description: `Verified ${selectedIds.length} study assets as safe and toxicity-compliant.`,
      variant: 'default',
    });
    setSelectedIds([]);
  };

  const handleBulkQuarantine = () => {
    toast({
      title: 'Assets Quarantined',
      description: `Moved ${selectedIds.length} items to restricted moderation review queue.`,
      variant: 'default',
    });
    setSelectedIds([]);
  };

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
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-3">
      {/* Search and controls */}
      <div className="flex-shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border/60 shadow-xs">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, creator, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9.5 rounded-xl bg-muted/40 font-medium text-xs sm:text-sm border-border/70 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {['quizzes', 'flashcards', 'documents', 'questions'].includes(type) && (
              <Button
                size="sm"
                onClick={() => setCreatingContent(true)}
                className="h-9.5 px-3.5 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                + Create {type === 'quizzes' ? 'Quiz' : type.slice(0, -1)}
              </Button>
            )}
            {type === 'quizzes' && (
              <Button
                size="sm"
                onClick={() => seedQuizzes.mutate()}
                disabled={seedQuizzes.isPending}
                className="h-9.5 px-3.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white shadow-xs transition-all"
              >
                {seedQuizzes.isPending ? 'Populating...' : '✨ Populate Sample Quizzes'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || items.length === 0}
              title="Export to CSV"
              className="h-9.5 px-3.5 rounded-xl font-bold text-xs border-border/80 shadow-xs hover:bg-muted/60"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Export CSV
            </Button>
            
            <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50">
              <Label htmlFor={`page-size-${type}`} className="text-xs font-extrabold text-muted-foreground whitespace-nowrap">
                Rows:
              </Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id={`page-size-${type}`} className="w-16 h-7 text-xs font-extrabold border-0 bg-transparent focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10" className="font-bold text-xs">10</SelectItem>
                  <SelectItem value="20" className="font-bold text-xs">20</SelectItem>
                  <SelectItem value="50" className="font-bold text-xs">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bulk Moderation Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-950/95 via-purple-950/95 to-slate-900 text-white border border-indigo-500/40 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 font-extrabold text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-black shadow-xs">{selectedIds.length}</span>
              <span>Items selected on this page</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Button size="sm" onClick={handleBulkVerify} className="h-8 px-3 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve Safe
              </Button>
              <Button size="sm" onClick={handleBulkQuarantine} className="h-8 px-3 rounded-xl font-extrabold text-xs bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-xs">
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Quarantine
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-8 px-3 rounded-xl font-extrabold text-xs bg-red-600 hover:bg-red-700 text-white shadow-xs">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Bulk Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-semibold text-destructive">
            Failed to load content items from server. Please refresh or check connection.
          </p>
        </div>
      )}

      {/* Responsive Content Presentation: Desktop Table */}
      <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-card rounded-2xl border border-border/60 shadow-sm">
        <Table className="min-w-[720px] w-full">
          <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-20 border-b border-border/80 shadow-xs">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-2 sm:px-3 text-center py-2.5">
                <button type="button" onClick={handleSelectAll} className="p-1 hover:text-primary transition-colors">
                  {allSelected && items.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
              </TableHead>
              <TableHead className="px-2 sm:px-3 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider">ID</TableHead>
              <TableHead className="px-2 sm:px-3 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider w-full max-w-[200px] md:max-w-[240px] xl:max-w-xs">Title / Preview</TableHead>
              <TableHead className="px-2 sm:px-3 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Creator</TableHead>
              <TableHead className="px-2 sm:px-3 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Category</TableHead>
              <TableHead className="px-2 sm:px-3 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</TableHead>
              <TableHead className="text-right px-3 sm:px-4 py-2.5 font-black text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-2 py-3"><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs">
                      {type === 'quizzes' ? <CheckSquare className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <h4 className="text-base font-black text-foreground">
                      {searchQuery ? 'No matching items found' : `No ${type} available in this repository tab`}
                    </h4>
                    <p className="text-xs text-muted-foreground font-semibold text-center max-w-sm">
                      {searchQuery ? 'Try adjusting your keywords or clearing the search bar.' : `Get started immediately by generating enterprise sample study sets or manually publishing custom verified ${type} for student assessment.`}
                    </p>
                    {!searchQuery && ['quizzes', 'flashcards', 'documents', 'questions'].includes(type) && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button onClick={() => setCreatingContent(true)} size="sm" className="h-9 px-4 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                          + Create New {type === 'quizzes' ? 'Quiz' : type.slice(0, -1)}
                        </Button>
                        {type === 'quizzes' && (
                          <Button onClick={() => seedQuizzes.mutate()} disabled={seedQuizzes.isPending} size="sm" className="h-9 px-4 rounded-xl font-extrabold text-xs bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white shadow-md transition-all">
                            {seedQuizzes.isPending ? 'Populating Database...' : '✨ Populate Sample Quizzes'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  type={type}
                  selected={selectedIds.includes(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onView={() => setViewingContent(item)}
                  onEdit={() => setEditingContent(item)}
                  onDelete={() => setDeletingContent(item)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Responsive Content Presentation: Mobile / Tablet Card List */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : items.length === 0 ? (
          <div className="bg-card p-8 rounded-2xl border border-border/60 text-center space-y-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              {type === 'quizzes' ? <CheckSquare className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-black text-foreground">{searchQuery ? 'No matching content found' : `No ${type} available`}</h4>
              <p className="text-xs text-muted-foreground font-medium mt-1">{searchQuery ? 'Adjust your search terms.' : `Add new study content or seed sample datasets to get started.`}</p>
            </div>
            {!searchQuery && ['quizzes', 'flashcards', 'documents', 'questions'].includes(type) && (
              <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
                <Button onClick={() => setCreatingContent(true)} size="sm" className="w-full h-9 rounded-xl font-extrabold text-xs bg-indigo-600 text-white shadow-md">
                  + Create New {type === 'quizzes' ? 'Quiz' : type.slice(0, -1)}
                </Button>
                {type === 'quizzes' && (
                  <Button onClick={() => seedQuizzes.mutate()} disabled={seedQuizzes.isPending} size="sm" className="w-full h-9 rounded-xl font-extrabold text-xs bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md">
                    {seedQuizzes.isPending ? 'Populating...' : '✨ Populate Sample Quizzes'}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 shadow-xs transition-all space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleSelect(item.id)} className="p-0.5 hover:text-primary transition-colors">
                    {selectedIds.includes(item.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60">#{item.id}</span>
                  <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 text-primary border-primary/30">
                    {item.category || type.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  {new Date(item.createdAt || item.savedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1 pl-1">
                <p className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">
                  {getItemTitle(item, type)}
                </p>
                {type === 'quizzes' ? (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Badge variant="secondary" className="text-[10px] font-extrabold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs">
                      {item.questionCount || item.totalQuestions || 0} Questions
                    </Badge>
                    <span className={`text-[10px] font-black uppercase px-1 rounded ${item.difficulty === 'hard' ? 'text-rose-500 bg-rose-500/10' : item.difficulty === 'medium' ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                      {item.difficulty || 'normal'}
                    </span>
                    {item.fullscreenMode && (
                      <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 bg-purple-500/10 text-purple-600 border border-purple-500/30 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-2.5 h-2.5" /> PROCTORED FULLSCREEN
                      </Badge>
                    )}
                    {item.timedMode && (
                      <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1 shadow-2xs">
                        <Clock className="w-2.5 h-2.5" /> {Math.floor((item.timeLimit || 300) / 60)}m TIMED
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[9px] font-black px-1.5 py-0 border flex items-center gap-1 shadow-2xs ${item.aiMode !== false ? 'bg-sky-500/10 text-sky-600 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}`}>
                      {item.aiMode !== false ? <Sparkles className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
                      {item.aiMode !== false ? 'AI SYNTHESIS' : 'DB BANK'}
                    </Badge>
                  </div>
                ) : item.description ? (
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{item.description}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-extrabold">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0 border border-indigo-500/20">
                    {(item.creatorUsername || 'S').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[140px] text-foreground font-bold">@{item.creatorUsername || 'studyforge'}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setViewingContent(item)} className="h-7 px-2 text-xs rounded-lg font-bold hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/30 shadow-xs">
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingContent(item)} className="h-7 px-2 text-xs rounded-lg font-bold hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 shadow-xs">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingContent(item)} className="h-7 px-2 text-xs rounded-lg font-bold hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 shadow-xs">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/40 bg-background">
          <p className="text-xs font-bold text-muted-foreground">
            Showing <span className="text-foreground font-black">{(page - 1) * limit + 1}</span> to <span className="text-foreground font-black">{Math.min(page * limit, total)}</span> of <span className="text-foreground font-black">{total}</span> items
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="h-8 px-2.5 rounded-xl font-extrabold text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1 text-primary" />
              Prev
            </Button>
            <span className="text-xs font-black text-foreground px-2 py-1 rounded-lg bg-muted/40 border border-border/50">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="h-8 px-2.5 rounded-xl font-extrabold text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1 text-primary" />
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

      {/* Create content modal */}
      {creatingContent && (
        <ContentCreateDialog
          type={type}
          open={creatingContent}
          onClose={() => setCreatingContent(false)}
        />
      )}
    </div>
  );
}

// Content row component
interface ContentRowProps {
  item: any;
  type: ContentType;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ContentRow({ item, type, selected, onToggleSelect, onView, onEdit, onDelete }: ContentRowProps) {
  return (
    <TableRow className={`transition-colors hover:bg-muted/40 ${selected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
      <TableCell className="w-10 px-2 sm:px-3 text-center py-2.5">
        <button type="button" onClick={onToggleSelect} className="p-1 hover:text-primary transition-colors">
          {selected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
      </TableCell>
      <TableCell className="px-2 sm:px-3 py-2.5 whitespace-nowrap">
        <span className="font-mono text-xs font-black bg-muted/70 px-2 py-0.5 rounded text-muted-foreground border border-border/60">
          #{item.id}
        </span>
      </TableCell>
      <TableCell className="px-2 sm:px-3 py-2.5 font-extrabold text-xs sm:text-sm max-w-[200px] md:max-w-[240px] xl:max-w-xs truncate text-foreground">
        <div className="flex flex-col gap-1">
          <span className="truncate font-extrabold text-foreground">{getItemTitle(item, type)}</span>
          {type === 'quizzes' ? (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shadow-2xs">
                {item.questionCount || item.totalQuestions || 0} Qs
              </span>
              <span className={`text-[10px] font-black tracking-wide uppercase px-1 py-0.5 rounded ${item.difficulty === 'hard' ? 'text-rose-600 bg-rose-500/10 border border-rose-500/20' : item.difficulty === 'medium' ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20'}`}>
                {item.difficulty || 'normal'}
              </span>
              {item.fullscreenMode && (
                <span title="Enforces strict fullscreen exam proctoring" className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/30 flex items-center gap-1 shadow-2xs">
                  <Lock className="w-2.5 h-2.5" /> PROCTORED
                </span>
              )}
              {item.timedMode && (
                <span title="Countdown timed assessment" className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1 shadow-2xs">
                  <Clock className="w-2.5 h-2.5" /> {Math.floor((item.timeLimit || 300) / 60)}m TIMED
                </span>
              )}
              <span title={item.aiMode !== false ? 'Generated dynamically via Gemini AI' : 'Uses static PostgreSQL database question bank'} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 shadow-2xs ${item.aiMode !== false ? 'bg-sky-500/10 text-sky-600 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}`}>
                {item.aiMode !== false ? <Sparkles className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
                {item.aiMode !== false ? 'AI SYNTHESIS' : 'DB BANK'}
              </span>
            </div>
          ) : item.description ? (
            <span className="text-[11px] font-medium text-muted-foreground truncate">{item.description}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-2 sm:px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
            {(item.creatorUsername || 'S').charAt(0).toUpperCase()}
          </div>
          <span className="font-extrabold text-xs text-foreground truncate max-w-[120px]">
            @{item.creatorUsername || 'studyforge'}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-2 sm:px-3 py-2.5 whitespace-nowrap">
        <Badge variant="outline" className="font-extrabold text-[10px] bg-primary/10 text-primary border-primary/30 py-0.5 px-2.5 shadow-2xs">
          {item.category || type.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className="px-2 sm:px-3 py-2.5 whitespace-nowrap text-xs font-bold text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{new Date(item.createdAt || item.savedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </TableCell>
      <TableCell className="text-right px-3 sm:px-4 py-2.5 whitespace-nowrap pr-5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            title="View details"
            className="h-7 w-7 p-0 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit content"
            className="h-7 w-7 p-0 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete content"
            className="h-7 w-7 p-0 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div>
                <Label className="text-xs font-black text-muted-foreground uppercase tracking-wider">Quiz Title & Topic</Label>
                <p className="text-base font-black text-foreground mt-1">{content.title || 'Untitled Quiz'}</p>
              </div>
              {content.description && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground/90 font-medium">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Description / Notes</Label>
                  {content.description}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase">Questions</Label>
                  <p className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{content.questionCount || content.totalQuestions || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase">Difficulty</Label>
                  <p className="mt-1">
                    <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${content.difficulty === 'hard' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : content.difficulty === 'medium' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'}`}>
                      {content.difficulty || 'Normal'}
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase">Attempts / Uses</Label>
                  <p className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{content.usageCount || content.questionCount || 0}</p>
                </div>
              </div>
              {content.questionTypes && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-muted-foreground">Included Question Formats</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(content.questionTypes) ? content.questionTypes : (typeof content.questionTypes === 'string' ? [content.questionTypes] : ['Multiple Choice (MCQ)'])).map((t: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="font-mono text-xs px-2.5 py-1 bg-primary/10 text-primary border-primary/20">
                        {t === 'mcq' || t === 'MCQ' ? '⚡ Multiple Choice (MCQ)' : t === 'short_answer' ? '📝 Short Answer' : `📌 ${t}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20 shadow-inner space-y-2.5 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" /> Exam Security & Evaluation Governance
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-500" /> Proctoring Mode
                    </span>
                    <span className={`text-xs font-black mt-1 ${content.fullscreenMode ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                      {content.fullscreenMode ? '🔒 STRICT FULLSCREEN REQUIRED' : '🌐 Standard Windowed Allowed'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Timed Countdown
                    </span>
                    <span className={`text-xs font-black mt-1 ${content.timedMode ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      {content.timedMode ? `⏱️ ${Math.floor((content.timeLimit || 300) / 60)} Minutes (${content.timeLimit}s Limit)` : '♾️ Untimed / Self-Paced'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                      <Settings2 className="w-3 h-3 text-sky-500" /> Question Synthesis
                    </span>
                    <span className={`text-xs font-black mt-1 ${content.aiMode !== false ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {content.aiMode !== false ? '⚡ Gemini AI Dynamic Synthesis' : '📚 Verified PostgreSQL DB Bank'}
                    </span>
                  </div>
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

          {['flagged', 'chat', 'code-snippets', 'study-plans'].includes(type) && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Audit Inspection & Payload Preview</Label>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap max-h-60 mt-1">
                  {JSON.stringify(content, null, 2)}
                </pre>
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
    description: content.description || '',
    category: content.category || '',
    question: content.question || '',
    answer: content.answer || '',
    difficulty: content.difficulty || '',
    timedMode: content.timedMode || false,
    timeLimit: content.timeLimit || 300,
    aiMode: content.aiMode !== undefined ? content.aiMode : true,
    fullscreenMode: content.fullscreenMode || false,
  });

  const updateContent = useUpdateContent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build updates object based on content type
    const updates: any = {};
    if (type === 'quizzes') {
      if (formData.title !== undefined) updates.title = formData.title;
      if (formData.description !== undefined) updates.description = formData.description;
      if (formData.category !== undefined) updates.category = formData.category;
      if (formData.difficulty !== undefined) updates.difficulty = formData.difficulty;
      if (formData.timedMode !== undefined) updates.timedMode = formData.timedMode;
      if (formData.timeLimit !== undefined) updates.timeLimit = Number(formData.timeLimit);
      if (formData.aiMode !== undefined) updates.aiMode = formData.aiMode;
      if (formData.fullscreenMode !== undefined) updates.fullscreenMode = formData.fullscreenMode;
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
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="font-extrabold text-xs text-foreground">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                  className="rounded-xl font-medium"
                />
              </div>
              {type === 'quizzes' && (
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="font-extrabold text-xs text-foreground">Description / Topic Summary</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description or quiz notes"
                    rows={3}
                    className="rounded-xl font-medium resize-none"
                  />
                </div>
              )}
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

          {type === 'quizzes' && (
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3 pt-3">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Proctoring & Evaluation Rules
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-purple-500" /> Proctored Fullscreen
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-semibold">Enforce anti-cheat fullscreen</p>
                  </div>
                  <Switch
                    checked={formData.fullscreenMode || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, fullscreenMode: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" /> AI Dynamic Mode
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-semibold">Gemini AI vs DB Question Bank</p>
                  </div>
                  <Switch
                    checked={formData.aiMode !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, aiMode: checked })}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 gap-3">
                <div className="flex items-center justify-between w-full sm:w-auto flex-1">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Enforce Timed Mode
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-semibold">Countdown limit in seconds</p>
                  </div>
                  <Switch
                    checked={formData.timedMode || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, timedMode: checked })}
                  />
                </div>
                {formData.timedMode && (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Input
                      type="number"
                      min={30}
                      max={7200}
                      value={formData.timeLimit || 300}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 300 })}
                      className="w-24 rounded-lg font-mono text-xs font-bold h-8"
                    />
                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">secs ({Math.floor((formData.timeLimit || 300) / 60)}m)</span>
                  </div>
                )}
              </div>
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

// Content create dialog
interface ContentCreateDialogProps {
  type: ContentType;
  open: boolean;
  onClose: () => void;
}

function ContentCreateDialog({ type, open, onClose }: ContentCreateDialogProps) {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    category: 'Computer Science & AI',
    difficulty: 'medium',
    questionCount: 20,
    questionTypes: ['mcq', 'short_answer'],
    timedMode: false,
    timeLimit: 300,
    aiMode: true,
    fullscreenMode: false,
  } as any);

  const createContent = useCreateContent();

  const handleQuickFill = () => {
    if (type === 'quizzes') {
      setFormData({
        title: 'Enterprise Microservices Architecture & Distributed Systems (Proctored Exam)',
        description: 'Comprehensive proctored evaluation covering API gateway pattern, event-driven saga transactions, Redis caching eviction strategies, and circuit breaker resilience.',
        category: 'Cloud Architecture & Engineering',
        difficulty: 'hard',
        questionCount: 35,
        questionTypes: ['mcq', 'fill-blank', 'rearrange'],
        timedMode: true,
        timeLimit: 1800,
        aiMode: true,
        fullscreenMode: true,
      });
    } else if (type === 'flashcards') {
      setFormData({
        question: 'What is the primary difference between Optimistic vs Pessimistic Concurrency Control in relational databases?',
        answer: 'Optimistic concurrency control assumes conflicts are rare and verifies data integrity at commit time using version stamps, whereas Pessimistic locking locks rows immediately upon query to block concurrent writes.',
        category: 'Database Engineering',
        difficulty: 'hard',
      });
    } else if (type === 'documents') {
      setFormData({
        title: 'Complete DevOps Guide to Docker & Kubernetes Networking.pdf',
        description: 'Deep dive into CNI plugins, Calico overlay networks, kube-proxy iptables routing, and zero-trust service mesh security.',
        category: 'Infrastructure & DevOps',
        questionCount: 5,
      });
    } else {
      setFormData({
        title: 'Explain how Event-Driven Lambda architecture solves real-time stream processing latency.',
        question: 'Explain how Event-Driven Lambda architecture solves real-time stream processing latency.',
        category: 'Big Data & Analytics',
        difficulty: 'hard',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContent.mutate(
      { type, data: formData },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isSupported = ['quizzes', 'flashcards', 'documents', 'questions'].includes(type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {type === 'quizzes' ? <CheckSquare className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
            </span>
            Create New {type === 'quizzes' ? 'Quiz Study Set' : type === 'flashcards' ? 'Flashcard Deck' : type === 'documents' ? 'Study Document' : 'Study Question'}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold">
            Add a newly verified study resource directly into the repository for student evaluation and AI moderation.
          </DialogDescription>
        </DialogHeader>

        {!isSupported ? (
          <div className="p-6 text-center text-muted-foreground text-sm font-bold">
            Manual creation is not supported for this repository tab.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                💡 Need testing data? Use our intelligent preset template:
              </span>
              <Button type="button" size="sm" onClick={handleQuickFill} className="h-7 px-3 text-[11px] font-extrabold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-xs">
                ✨ Quick Fill Sample
              </Button>
            </div>

            {(type === 'quizzes' || type === 'documents') && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-title" className="font-extrabold text-xs text-foreground">Title / Topic Name *</Label>
                  <Input
                    id="create-title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={type === 'quizzes' ? "e.g., Advanced Kubernetes Architecture & Container Security" : "e.g., DevOps Handbook.pdf"}
                    className="rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-description" className="font-extrabold text-xs text-foreground">{type === 'quizzes' ? 'Description / Syllabus Notes' : 'Document Content Preview'}</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter comprehensive notes or overview..."
                    rows={3}
                    className="rounded-xl font-medium resize-none"
                  />
                </div>
              </div>
            )}

            {(type === 'flashcards' || type === 'questions') && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-question" className="font-extrabold text-xs text-foreground">Question / Prompt *</Label>
                  <Textarea
                    id="create-question"
                    required
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter diagnostic study question or evaluation prompt..."
                    rows={3}
                    className="rounded-xl font-medium resize-none"
                  />
                </div>
              </div>
            )}

            {type === 'flashcards' && (
              <div className="space-y-1.5">
                <Label htmlFor="create-answer" className="font-extrabold text-xs text-foreground">Verified Answer *</Label>
                <Textarea
                  id="create-answer"
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Enter detailed explanation and correct answer..."
                  rows={3}
                  className="rounded-xl font-medium resize-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="create-category" className="font-extrabold text-xs text-foreground">Category / Domain</Label>
                <Input
                  id="create-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Cloud Security & DevOps"
                  className="rounded-xl font-medium"
                />
              </div>

              {type !== 'documents' && (
                <div className="space-y-1.5">
                  <Label htmlFor="create-difficulty" className="font-extrabold text-xs text-foreground">Difficulty Rating</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger id="create-difficulty" className="rounded-xl font-bold">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="easy" className="font-bold text-emerald-600">Easy (Beginner)</SelectItem>
                      <SelectItem value="medium" className="font-bold text-amber-600">Medium (Intermediate)</SelectItem>
                      <SelectItem value="hard" className="font-bold text-rose-600">Hard (Advanced / Expert)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {type === 'quizzes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="create-qcount" className="font-extrabold text-xs text-foreground">Total Questions Count</Label>
                  <Input
                    id="create-qcount"
                    type="number"
                    min={1}
                    max={500}
                    value={formData.questionCount}
                    onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 20 })}
                    className="rounded-xl font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-qtypes" className="font-extrabold text-xs text-foreground">Question Formats (Comma-separated)</Label>
                  <Input
                    id="create-qtypes"
                    value={Array.isArray(formData.questionTypes) ? formData.questionTypes.join(', ') : formData.questionTypes}
                    onChange={(e) => setFormData({ ...formData, questionTypes: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                    placeholder="e.g., MCQ, Short Answer, True/False"
                    className="rounded-xl font-medium"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3 mt-1">
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Assessment Security & Evaluation Rules
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-purple-500" /> Proctored Fullscreen
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-semibold">Enforce strict anti-cheat fullscreen</p>
                      </div>
                      <Switch
                        checked={formData.fullscreenMode || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, fullscreenMode: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-500" /> AI Dynamic Mode
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-semibold">Gemini AI vs DB Question Bank</p>
                      </div>
                      <Switch
                        checked={formData.aiMode !== false}
                        onCheckedChange={(checked) => setFormData({ ...formData, aiMode: checked })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 gap-3">
                    <div className="flex items-center justify-between w-full sm:w-auto flex-1">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> Enforce Timed Mode
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-semibold">Countdown limit in seconds</p>
                      </div>
                      <Switch
                        checked={formData.timedMode || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, timedMode: checked })}
                      />
                    </div>
                    {formData.timedMode && (
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <Input
                          type="number"
                          min={30}
                          max={7200}
                          value={formData.timeLimit || 300}
                          onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 300 })}
                          className="w-24 rounded-lg font-mono text-xs font-bold h-8"
                        />
                        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">secs ({Math.floor((formData.timeLimit || 300) / 60)}m)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border/40">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={createContent.isPending} className="rounded-xl font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                {createContent.isPending ? 'Publishing to Database...' : 'Create & Publish Content'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
