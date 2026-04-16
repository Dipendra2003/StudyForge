import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUsers, useUserActivity, useUserLoginHistory, useSuspiciousActivity } from '@/hooks/useAdminQuery';
import {
  useUpdateUser,
  useSuspendUser,
  useActivateUser,
  useDeleteUser,
} from '@/hooks/useAdminMutation';
import {
  useResetUserPassword,
  useSendSecurityAlert,
  useBulkSuspendUsers,
  useBulkActivateUsers,
  useBulkDeleteUsers,
} from '@/hooks/useSecurityMutations';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Search,
  Edit,
  Ban,
  CheckCircle,
  Trash2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Key,
  Shield,
  Filter,
  MoreVertical,
  History,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportUsersToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { userEditSchema, type UserEditFormData } from '@/lib/admin-validation';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UserActivity {
  loginHistory: Array<{
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
  }>;
  quizAttempts: Array<{
    id: number;
    score: number;
    totalQuestions: number;
    category: string;
    createdAt: string;
  }>;
  contentCreated: {
    quizzes: number;
    flashcards: number;
    documents: number;
    questions: number;
  };
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

export default function UserManagement() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingActivity, setViewingActivity] = useState<number | null>(null);
  const [viewingLoginHistory, setViewingLoginHistory] = useState<number | null>(null);
  const [viewingSecurity, setViewingSecurity] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    role?: 'user' | 'admin';
    isActive?: boolean;
    emailVerified?: boolean;
  }>({});
  const { toast } = useToast();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch users with pagination and search
  const { data, isLoading, error } = useUsers({
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...filters,
  });

  const users = (data as any)?.data?.users || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Bulk operations
  const bulkSuspend = useBulkSuspendUsers();
  const bulkActivate = useBulkActivateUsers();
  const bulkDelete = useBulkDeleteUsers();

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u: User) => u.id)));
    }
  };

  const handleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkSuspend = () => {
    if (selectedUsers.size === 0) return;
    bulkSuspend.mutate(Array.from(selectedUsers), {
      onSuccess: () => setSelectedUsers(new Set()),
    });
  };

  const handleBulkActivate = () => {
    if (selectedUsers.size === 0) return;
    bulkActivate.mutate(Array.from(selectedUsers), {
      onSuccess: () => setSelectedUsers(new Set()),
    });
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedUsers.size} users? This cannot be undone.`)) {
      bulkDelete.mutate(Array.from(selectedUsers), {
        onSuccess: () => setSelectedUsers(new Set()),
      });
    }
  };

  // Handle CSV export
  const handleExport = () => {
    if (users.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no users to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `users-export-${timestamp}.csv`;
      exportUsersToCSV(users, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${users.length} users to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export users. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by username or email..."
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
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || users.length === 0}
              title="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
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

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Role</Label>
                <Select
                  value={filters.role || 'all'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, role: value === 'all' ? undefined : value as 'user' | 'admin' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'suspended'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, isActive: value === 'all' ? undefined : value === 'active' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Email Verified</Label>
                <Select
                  value={filters.emailVerified === undefined ? 'all' : filters.emailVerified ? 'verified' : 'unverified'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, emailVerified: value === 'all' ? undefined : value === 'verified' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Bulk actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                  disabled={bulkActivate.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSuspend}
                  disabled={bulkSuspend.isPending}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDelete.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load users. Please try again.
          </p>
        </div>
      )}

      {/* User table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: User) => (
                <UserRow
                  key={user.id}
                  user={user}
                  selected={selectedUsers.has(user.id)}
                  onSelect={() => handleSelectUser(user.id)}
                  onEdit={() => setEditingUser(user)}
                  onViewActivity={() => setViewingActivity(user.id)}
                  onViewLoginHistory={() => setViewingLoginHistory(user.id)}
                  onViewSecurity={() => setViewingSecurity(user.id)}
                  onDelete={() => setDeletingUser(user)}
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
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

      {/* Edit user dialog */}
      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* View activity dialog */}
      {viewingActivity && (
        <UserActivityDialog
          userId={viewingActivity}
          open={!!viewingActivity}
          onClose={() => setViewingActivity(null)}
        />
      )}

      {/* View login history dialog */}
      {viewingLoginHistory && (
        <LoginHistoryDialog
          userId={viewingLoginHistory}
          open={!!viewingLoginHistory}
          onClose={() => setViewingLoginHistory(null)}
        />
      )}

      {/* View security alerts dialog */}
      {viewingSecurity && (
        <SecurityAlertsDialog
          userId={viewingSecurity}
          open={!!viewingSecurity}
          onClose={() => setViewingSecurity(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingUser && (
        <UserDeleteDialog
          user={deletingUser}
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}

// User table row component
interface UserRowProps {
  user: User;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewActivity: () => void;
  onViewLoginHistory: () => void;
  onViewSecurity: () => void;
  onDelete: () => void;
}

function UserRow({ user, selected, onSelect, onEdit, onViewActivity, onViewLoginHistory, onViewSecurity, onDelete }: UserRowProps) {
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const resetPassword = useResetUserPassword();
  const sendAlert = useSendSecurityAlert();

  const handleSuspend = () => {
    suspendUser.mutate(user.id);
  };

  const handleActivate = () => {
    activateUser.mutate(user.id);
  };

  const handleResetPassword = () => {
    if (confirm(`Reset password for ${user.username}? A temporary password will be sent to their email.`)) {
      resetPassword.mutate(user.id);
    }
  };

  const handleSendAlert = () => {
    sendAlert.mutate(user.id);
  };

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell className="font-mono text-sm">{user.id}</TableCell>
      <TableCell className="font-medium">{user.username}</TableCell>
      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{user.email}</TableCell>
      <TableCell>
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={user.isActive ? 'default' : 'destructive'}
          className={cn(
            user.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : ''
          )}
        >
          {user.isActive ? 'Active' : 'Suspended'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewActivity}>
                <Activity className="h-4 w-4 mr-2" />
                View Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewLoginHistory}>
                <History className="h-4 w-4 mr-2" />
                Login History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewSecurity}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Security Alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleResetPassword}>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendAlert}>
                <Shield className="h-4 w-4 mr-2" />
                Send Security Alert
              </DropdownMenuItem>
              {user.isActive ? (
                <DropdownMenuItem onClick={handleSuspend} disabled={suspendUser.isPending}>
                  <Ban className="h-4 w-4 mr-2 text-orange-600" />
                  Suspend User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivate} disabled={activateUser.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Activate User
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

// User edit dialog component
interface UserEditDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

function UserEditDialog({ user, open, onClose }: UserEditDialogProps) {
  const updateUser = useUpdateUser();
  const { toast } = useToast();
  
  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      fullName: user.fullName || '',
      email: user.email,
      role: user.role,
    },
  });

  const handleSubmit = (data: UserEditFormData) => {
    updateUser.mutate(
      {
        userId: user.id,
        updates: {
          fullName: data.fullName || undefined,
          email: data.email,
          role: data.role,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'User updated',
            description: 'User details have been successfully updated.',
          });
          onClose();
        },
        onError: (error: any) => {
          toast({
            title: 'Update failed',
            description: error.message || 'Failed to update user. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user.username}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter full name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="Enter email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending || !form.formState.isValid}>
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// User activity dialog component
interface UserActivityDialogProps {
  userId: number;
  open: boolean;
  onClose: () => void;
}

function UserActivityDialog({ userId, open, onClose }: UserActivityDialogProps) {
  const { data: activity, isLoading } = useUserActivity(userId);
  const activityData = (activity as any)?.data as UserActivity | undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Activity</DialogTitle>
          <DialogDescription>
            View login history and quiz attempts for this user
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : activityData ? (
          <div className="space-y-6">
            {/* Content Created Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Content Created</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">{activityData.contentCreated.quizzes}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Quizzes</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">{activityData.contentCreated.flashcards}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Flashcards</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">{activityData.contentCreated.documents}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Documents</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">{activityData.contentCreated.questions}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                </div>
              </div>
            </div>

            {/* Recent Quiz Attempts */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Quiz Attempts</h3>
              {activityData.quizAttempts.length === 0 ? (
                <p className="text-sm text-gray-500">No quiz attempts yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activityData.quizAttempts.slice(0, 10).map((attempt: any) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{attempt.category}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {attempt.score}/{attempt.totalQuestions}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Login History */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Login History</h3>
              {activityData.loginHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No login history available.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activityData.loginHistory.slice(0, 10).map((login: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm">
                          {new Date(login.timestamp).toLocaleString()}
                        </p>
                        {login.ipAddress && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                            {login.ipAddress}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={login.status === 'success' ? 'default' : 'destructive'}
                        className={cn(
                          login.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : ''
                        )}
                      >
                        {login.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Failed to load activity data.</p>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// User delete confirmation dialog
interface UserDeleteDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

function UserDeleteDialog({ user, open, onClose }: UserDeleteDialogProps) {
  const deleteUser = useDeleteUser();

  const handleDelete = () => {
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete user <strong>{user.username}</strong>?
            This action cannot be undone and will remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteUser.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Login history dialog
interface LoginHistoryDialogProps {
  userId: number;
  open: boolean;
  onClose: () => void;
}

function LoginHistoryDialog({ userId, open, onClose }: LoginHistoryDialogProps) {
  const { data, isLoading } = useUserLoginHistory(userId);
  const history = (data as any)?.data || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Login History</DialogTitle>
          <DialogDescription>
            Recent login attempts for this user
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No login history available.</p>
        ) : (
          <div className="space-y-2">
            {history.map((log: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Action: {log.action}
                  </p>
                  {log.ipAddress && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1">
                      IP: {log.ipAddress}
                    </p>
                  )}
                  {log.userAgent && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {log.userAgent}
                    </p>
                  )}
                </div>
                <Badge
                  variant={log.status === 'success' ? 'default' : 'destructive'}
                  className={cn(
                    log.status === 'success'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : ''
                  )}
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Security alerts dialog
interface SecurityAlertsDialogProps {
  userId: number;
  open: boolean;
  onClose: () => void;
}

function SecurityAlertsDialog({ userId, open, onClose }: SecurityAlertsDialogProps) {
  const { data, isLoading } = useSuspiciousActivity(userId);
  const alerts = (data as any)?.data || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Security Alerts</DialogTitle>
          <DialogDescription>
            Suspicious activity detected for this user
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-gray-500">No suspicious activity detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert: any, index: number) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-l-4',
                  alert.severity === 'high' && 'bg-red-50 dark:bg-red-900/20 border-red-500',
                  alert.severity === 'medium' && 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500',
                  alert.severity === 'low' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.description}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Type: {alert.alertType}
                    </p>
                  </div>
                  <Badge
                    variant={alert.severity === 'high' ? 'destructive' : 'default'}
                    className={cn(
                      alert.severity === 'medium' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                      alert.severity === 'low' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    )}
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
