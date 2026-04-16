import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMessages } from '@/hooks/useAdminQuery';
import { useUpdateMessageStatus } from '@/hooks/useAdminMutation';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { messageStatusSchema, type MessageStatusFormData } from '@/lib/admin-validation';
import { useToast } from '@/hooks/use-toast';

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
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load messages. Please try again.
          </p>
        </div>
      )}

      {/* Message table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
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

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
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

// Message detail dialog component
interface MessageDetailDialogProps {
  message: ContactMessage;
  open: boolean;
  onClose: () => void;
}

function MessageDetailDialog({ message, open, onClose }: MessageDetailDialogProps) {
  const updateStatus = useUpdateMessageStatus();
  const { toast } = useToast();
  
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
