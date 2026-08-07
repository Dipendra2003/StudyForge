import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMessages } from '@/hooks/useAdminQuery';
import { useUpdateMessageStatus } from '@/hooks/useAdminMutation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Mail,
  MailOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Megaphone,
  Send,
  MessageSquareReply,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { messageStatusSchema, type MessageStatusFormData } from '@/lib/admin-validation';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiPost } from '@/lib/api';

// Types
interface ContactMessage {
  id: number;
  userId?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export default function EmailManagement() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingMessage, setViewingMessage] = useState<ContactMessage | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  // Fetch messages with pagination and status filter
  const { data, isLoading, error } = useMessages({
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
  });

  const messages = (data as any)?.messages || [];
  const total = (data as any)?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-6.5rem)] -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 bg-background overflow-hidden space-y-4">
      {/* Header with filters and broadcast action - Pinned at top */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Button
          onClick={() => setShowBroadcast(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 font-semibold shadow-sm"
        >
          <Megaphone className="h-4 w-4" />
          Broadcast Announcement Campaign
        </Button>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-sm text-gray-600 dark:text-gray-400">
            Status:
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="status-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="page-size" className="text-sm text-gray-600 dark:text-gray-400">
            Show:
          </Label>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger id="page-size" className="w-24">
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
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load messages. Please try again.
          </p>
        </div>
      )}

      {/* Message table - Desktop Viewport-Locked */}
      <div className="hidden md:block flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {statusFilter !== 'all' 
                    ? `No ${statusFilter} messages found.` 
                    : 'No messages found.'}
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message: ContactMessage) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  onView={() => setViewingMessage(message)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile & Tablet Conversational Card Grid */}
      <div className="block md:hidden flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
        {isLoading ? (
          Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3 rounded-2xl border-border/80">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </Card>
          ))
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed text-sm font-semibold">
            {statusFilter !== 'all' ? `No ${statusFilter} messages found.` : 'No helpdesk tickets recorded.'}
          </div>
        ) : (
          messages.map((message: ContactMessage) => (
            <MessageCard
              key={message.id}
              message={message}
              onView={() => setViewingMessage(message)}
            />
          ))
        )}
      </div>

      {/* Pagination - Pinned Bottom Deck */}
      {!isLoading && totalPages > 1 && (
        <div className="flex-shrink-0 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} messages
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

      {/* Message detail dialog */}
      {viewingMessage && (
        <MessageDetailDialog
          message={viewingMessage}
          open={!!viewingMessage}
          onClose={() => setViewingMessage(null)}
        />
      )}

      <BroadcastModal open={showBroadcast} onClose={() => setShowBroadcast(false)} />
    </div>
  );
}

// Message table row component
interface MessageRowProps {
  message: ContactMessage;
  onView: () => void;
}

function MessageRow({ message, onView }: MessageRowProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Mail className="h-4 w-4" />;
      case 'read':
        return <MailOpen className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'read':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return '';
    }
  };

  return (
    <TableRow className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={onView}>
      <TableCell>
        <div>
          <p className="font-medium">{message.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message.email}</p>
        </div>
      </TableCell>
      <TableCell className="max-w-md">
        <p className="truncate">{message.subject}</p>
      </TableCell>
      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
        {new Date(message.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn(getStatusColor(message.status))}>
          <span className="flex items-center gap-1">
            {getStatusIcon(message.status)}
            {message.status}
          </span>
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Mobile responsive card view for helpdesk tickets
function MessageCard({ message, onView }: MessageRowProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Mail className="h-3.5 w-3.5" />;
      case 'read':
        return <MailOpen className="h-3.5 w-3.5" />;
      case 'resolved':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      default:
        return <Mail className="h-3.5 w-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'read':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card className="p-4 space-y-3 border-border/70 rounded-2xl shadow-sm transition-all bg-card hover:border-primary/40 cursor-pointer" onClick={onView}>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1", getStatusColor(message.status))}>
          {getStatusIcon(message.status)}
          <span>{message.status}</span>
        </Badge>
        <span className="text-[11px] text-muted-foreground font-semibold">
          {new Date(message.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="font-extrabold text-sm text-foreground leading-snug">{message.subject}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{message.message}</p>
      </div>

      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span className="truncate max-w-[220px] font-medium">{message.name} ({message.email})</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-extrabold text-primary hover:bg-primary/10 rounded-lg">
          Reply / View <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

// Message detail dialog component
interface MessageDetailDialogProps {
  message: ContactMessage;
  open: boolean;
  onClose: () => void;
}

function MessageDetailDialog({ message, open, onClose }: MessageDetailDialogProps) {
  const updateStatus = useUpdateMessageStatus();
  const { toast } = useToast();
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      const res = await apiPost(`/api/admin/messages/${message.id}/reply`, { replyMessage: replyText });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Reply Sent', description: 'Reply dispatched via EmailService and ticket marked responded.' });
        setReplyText('');
        onClose();
      } else {
        throw new Error(data.message || 'Failed to send reply');
      }
    } catch (err: any) {
      toast({ title: 'Reply Failed', description: err.message || 'Error sending direct reply', variant: 'destructive' });
    } finally {
      setIsReplying(false);
    }
  };

  const form = useForm<MessageStatusFormData>({
    resolver: zodResolver(messageStatusSchema),
    defaultValues: {
      status: message.status,
    },
  });

  const handleStatusUpdate = (data: MessageStatusFormData) => {
    if (data.status !== message.status) {
      updateStatus.mutate(
        { id: message.id, status: data.status },
        {
          onSuccess: () => {
            toast({
              title: 'Status updated',
              description: 'Message status has been successfully updated.',
            });
            onClose();
          },
          onError: (error: any) => {
            toast({
              title: 'Update failed',
              description: error.message || 'Failed to update status. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Message Details</DialogTitle>
          <DialogDescription>
            Contact form submission from {message.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sender Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sender Name
              </Label>
              <p className="mt-1 text-sm">{message.name}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </Label>
              <a
                href={`mailto:${message.email}`}
                className="mt-1 text-sm text-primary hover:underline flex items-center gap-1"
              >
                {message.email}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Subject
            </Label>
            <p className="mt-1 text-sm">{message.subject}</p>
          </div>

          {/* Message Content */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Message
            </Label>
            <div className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            </div>
          </div>

          {/* Inline Admin Reply & Helpdesk Action */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <MessageSquareReply className="h-4 w-4" />
              Direct Student Helpdesk Reply
            </div>
            <Textarea
              placeholder="Type your official response here. This will be formatted as a StudyForge Helpdesk email and sent directly to the student..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isReplying}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isReplying ? 'Transmitting Reply...' : 'Send Reply & Resolve Ticket'}
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Received
              </Label>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Last Updated
              </Label>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {new Date(message.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Status Update */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleStatusUpdate)}>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  {form.watch('status') !== message.status && (
                    <Button
                      type="submit"
                      disabled={updateStatus.isPending || !form.formState.isValid}
                    >
                      {updateStatus.isPending ? 'Updating...' : 'Update Status'}
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { toast } = useToast();

  const handleBroadcast = async () => {
    if (!subject.trim() || !message.trim()) return;
    setIsBroadcasting(true);
    try {
      const res = await apiPost('/api/admin/messages/broadcast', { subject, message, targetGroup: 'all' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Broadcast Dispatched!',
          description: `Successfully transmitted announcement to ${data.count || 'all'} active students.`,
        });
        setSubject('');
        setMessage('');
        onClose();
      } else {
        throw new Error(data.message || 'Broadcast dispatch failed');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to dispatch broadcast', variant: 'destructive' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            <Megaphone className="h-5 w-5" />
            System-Wide Announcement Broadcast
          </DialogTitle>
          <DialogDescription>
            Transmit official announcements or feature newsletters across active student accounts and notification dashboards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <Label className="text-sm font-semibold">Campaign Subject</Label>
            <Input
              placeholder="e.g., StudyForge 2.0 Launch - New Gamification Badges Available!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Announcement Content (Rich Markdown / Plain Text)</Label>
            <Textarea
              placeholder="Write out your complete community update here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[160px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBroadcasting}>
            Cancel
          </Button>
          <Button
            onClick={handleBroadcast}
            disabled={!subject.trim() || !message.trim() || isBroadcasting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isBroadcasting ? 'Broadcasting Campaign...' : 'Dispatch Broadcast Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
