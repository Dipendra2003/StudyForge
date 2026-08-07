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
  Copy,
  Check,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportUsersToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { userEditSchema, type UserEditFormData } from '@/lib/admin-validation';
import { apiPost } from '@/lib/api';

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
    chatMessages?: number;
    codeSnippets?: number;
    studyPlans?: number;
  };
  activeSessionsCount?: number;
  gamification?: {
    totalPoints?: number;
    xpPoints?: number;
    level?: number;
    streakDays?: number;
    longestStreak?: number;
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
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [sendAlertUser, setSendAlertUser] = useState<User | null>(null);
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
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-6.5rem)] -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 bg-background overflow-hidden">
      {/* Fixed Top Deck - Will NEVER scroll away */}
      <div className="flex-shrink-0 space-y-4 pb-4 border-b border-border mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              User Governance & Account Defense
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage accounts, roles, active sessions, and dispatch security directives in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-card"
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
              className="bg-card"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <div className="flex items-center gap-1.5 ml-2">
              <Label htmlFor="page-size" className="text-xs font-semibold text-muted-foreground uppercase">
                Show:
              </Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id="page-size" className="w-20 bg-card h-8 text-xs">
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

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Role</Label>
                <Select
                  value={filters.role || 'all'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, role: value === 'all' ? undefined : value as 'user' | 'admin' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-card h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">Student (user)</SelectItem>
                    <SelectItem value="admin">Administrator (admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
                <Select
                  value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'suspended'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, isActive: value === 'all' ? undefined : value === 'active' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-card h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Accounts</SelectItem>
                    <SelectItem value="suspended">Suspended Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Email Verification</Label>
                <Select
                  value={filters.emailVerified === undefined ? 'all' : filters.emailVerified ? 'verified' : 'unverified'}
                  onValueChange={(value) => {
                    setFilters({ ...filters, emailVerified: value === 'all' ? undefined : value === 'verified' });
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-1 bg-card h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="verified">Verified Emails</SelectItem>
                    <SelectItem value="unverified">Unverified Emails</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setPage(1);
                }}
                className="text-xs text-muted-foreground"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedUsers.size > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {selectedUsers.size} student{selectedUsers.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkActivate}
                disabled={bulkActivate.isPending}
                className="bg-background border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 h-8 text-xs font-semibold"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSuspend}
                disabled={bulkSuspend.isPending}
                className="bg-background border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 h-8 text-xs font-semibold"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="bg-background border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 h-8 text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex-shrink-0">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Failed to load users from governance server. Please check active session or retry.
          </p>
        </div>
      )}

      {/* Scrollable User Table / Cards Container */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 min-h-0 overflow-auto border rounded-xl shadow-sm bg-card/60 backdrop-blur">
          <div className="min-w-[720px] w-full">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Username</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
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
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm font-medium">
                      {searchQuery ? 'No accounts match your filter criteria.' : 'No student accounts found in directory.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: User) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      selected={selectedUsers.has(user.id)}
                      onSelect={() => handleSelectUser(user.id)}
                      onEdit={() => setTimeout(() => setEditingUser(user), 50)}
                      onViewActivity={() => setTimeout(() => setViewingActivity(user.id), 50)}
                      onViewLoginHistory={() => setTimeout(() => setViewingLoginHistory(user.id), 50)}
                      onViewSecurity={() => setTimeout(() => setViewingSecurity(user.id), 50)}
                      onResetPassword={() => setTimeout(() => setResetPasswordUser(user), 50)}
                      onSendAlert={() => setTimeout(() => setSendAlertUser(user), 50)}
                      onDelete={() => setTimeout(() => setDeletingUser(user), 50)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile & Tablet Card List View */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto space-y-3 p-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-medium border rounded-xl bg-card">
              {searchQuery ? 'No accounts match your search.' : 'No student accounts found.'}
            </div>
          ) : (
            users.map((user: User) => (
              <UserCard
                key={user.id}
                user={user}
                selected={selectedUsers.has(user.id)}
                onSelect={() => handleSelectUser(user.id)}
                onEdit={() => setTimeout(() => setEditingUser(user), 50)}
                onViewActivity={() => setTimeout(() => setViewingActivity(user.id), 50)}
                onViewLoginHistory={() => setTimeout(() => setViewingLoginHistory(user.id), 50)}
                onViewSecurity={() => setTimeout(() => setViewingSecurity(user.id), 50)}
                onResetPassword={() => setTimeout(() => setResetPasswordUser(user), 50)}
                onSendAlert={() => setTimeout(() => setSendAlertUser(user), 50)}
                onDelete={() => setTimeout(() => setDeletingUser(user), 50)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pinned Pagination Bar at Bottom Edge */}
      {!isLoading && totalPages > 0 && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-border text-xs">
          <p className="text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-bold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-bold text-foreground">{total}</span> accounts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="h-8 text-xs bg-card"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="font-semibold text-foreground px-2">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || totalPages === 0}
              className="h-8 text-xs bg-card"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Mounted Action & Governance Dialogs */}
      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {viewingActivity && (
        <UserActivityDialog
          userId={viewingActivity}
          open={!!viewingActivity}
          onClose={() => setViewingActivity(null)}
        />
      )}

      {viewingLoginHistory && (
        <LoginHistoryDialog
          userId={viewingLoginHistory}
          open={!!viewingLoginHistory}
          onClose={() => setViewingLoginHistory(null)}
        />
      )}

      {viewingSecurity && (
        <SecurityAlertsDialog
          userId={viewingSecurity}
          open={!!viewingSecurity}
          onClose={() => setViewingSecurity(null)}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {sendAlertUser && (
        <SendSecurityAlertDialog
          user={sendAlertUser}
          open={!!sendAlertUser}
          onClose={() => setSendAlertUser(null)}
        />
      )}

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
  onResetPassword: () => void;
  onSendAlert: () => void;
  onDelete: () => void;
}

function UserRow({ user, selected, onSelect, onEdit, onViewActivity, onViewLoginHistory, onViewSecurity, onResetPassword, onSendAlert, onDelete }: UserRowProps) {
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();

  const handleSuspend = () => {
    suspendUser.mutate(user.id);
  };

  const handleActivate = () => {
    activateUser.mutate(user.id);
  };

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      <TableCell className="w-12">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell className="font-mono text-sm">{user.id}</TableCell>
      <TableCell className="font-semibold text-foreground">{user.username}</TableCell>
      <TableCell className="text-sm text-muted-foreground truncate max-w-[220px]">{user.email}</TableCell>
      <TableCell>
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="px-2 py-0.5 text-xs font-semibold uppercase">
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={user.isActive ? 'default' : 'destructive'}
          className={cn(
            "px-2 py-0.5 text-xs font-semibold",
            user.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : ''
          )}
        >
          {user.isActive ? 'Active' : 'Suspended'}
        </Badge>
      </TableCell>
      <TableCell className="py-2.5 px-3 sm:px-4 pr-6 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit user"
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              <DropdownMenuItem onClick={onViewActivity} className="cursor-pointer">
                <Activity className="h-4 w-4 mr-2 text-blue-500" />
                View Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewLoginHistory} className="cursor-pointer">
                <History className="h-4 w-4 mr-2 text-indigo-500" />
                Login History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewSecurity} className="cursor-pointer">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                Security Alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword} className="cursor-pointer">
                <Key className="h-4 w-4 mr-2 text-purple-500" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendAlert} className="cursor-pointer">
                <Shield className="h-4 w-4 mr-2 text-red-500" />
                Send Security Alert
              </DropdownMenuItem>
              {user.isActive ? (
                <DropdownMenuItem onClick={handleSuspend} disabled={suspendUser.isPending} className="cursor-pointer text-orange-600">
                  <Ban className="h-4 w-4 mr-2 text-orange-600" />
                  Suspend User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivate} disabled={activateUser.isPending} className="cursor-pointer text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Activate User
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 dark:text-red-400 font-medium">
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

function UserCard({ user, selected, onSelect, onEdit, onViewActivity, onViewLoginHistory, onViewSecurity, onResetPassword, onSendAlert, onDelete }: UserRowProps) {
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();

  const handleSuspend = () => suspendUser.mutate(user.id);
  const handleActivate = () => activateUser.mutate(user.id);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{user.username}</span>
              <span className="text-xs text-muted-foreground font-mono">#{user.id}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              <DropdownMenuItem onClick={onViewActivity} className="cursor-pointer">
                <Activity className="h-4 w-4 mr-2 text-blue-500" /> View Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewLoginHistory} className="cursor-pointer">
                <History className="h-4 w-4 mr-2 text-indigo-500" /> Login History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewSecurity} className="cursor-pointer">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" /> Security Alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword} className="cursor-pointer">
                <Key className="h-4 w-4 mr-2 text-purple-500" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendAlert} className="cursor-pointer">
                <Shield className="h-4 w-4 mr-2 text-red-500" /> Send Security Alert
              </DropdownMenuItem>
              {user.isActive ? (
                <DropdownMenuItem onClick={handleSuspend} disabled={suspendUser.isPending} className="cursor-pointer text-orange-600">
                  <Ban className="h-4 w-4 mr-2 text-orange-600" /> Suspend User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivate} disabled={activateUser.isPending} className="cursor-pointer text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Activate User
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 font-medium">
                <Trash2 className="h-4 w-4 mr-2" /> Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
        <div className="flex items-center gap-2">
          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5 uppercase font-bold">
            {user.role}
          </Badge>
          <Badge
            variant={user.isActive ? 'default' : 'destructive'}
            className={cn(
              "text-[10px] px-2 py-0.5 font-bold",
              user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''
            )}
          >
            {user.isActive ? 'Active' : 'Suspended'}
          </Badge>
        </div>
        <span className="text-muted-foreground">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function ResetPasswordDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const resetPassword = useResetUserPassword();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConfirmReset = () => {
    resetPassword.mutate(user.id, {
      onSuccess: (res: any) => {
        if (res?.data?.tempPassword) {
          setTempPassword(res.data.tempPassword);
        } else {
          onClose();
        }
      }
    });
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Key className="h-5 w-5" /> Account Password Reset
          </DialogTitle>
          <DialogDescription>
            {tempPassword 
              ? `New credentials generated for student ${user.username}.` 
              : `Are you sure you want to trigger an administrative password reset for student ${user.username}?`}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4 py-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                Temporary Login Password
              </p>
              <div className="flex items-center justify-center gap-2 bg-background border rounded px-3 py-2 font-mono text-lg font-bold tracking-widest text-foreground">
                <span>{tempPassword}</span>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0 ml-2">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              An email notification has been dispatched. You may also share this temporary credential securely with the user.
            </p>
            <DialogFooter>
              <Button className="w-full" onClick={onClose}>Done & Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <span>This action immediately revokes their current password and generates an automated temporary passkey.</span>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose} disabled={resetPassword.isPending}>Cancel</Button>
              <Button onClick={handleConfirmReset} disabled={resetPassword.isPending} className="bg-primary text-primary-foreground">
                {resetPassword.isPending ? 'Generating...' : 'Generate New Password'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SendSecurityAlertDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const sendAlert = useSendSecurityAlert();
  const [alertType, setAlertType] = useState('Suspicious Login Activity');
  const [severity, setSeverity] = useState('high');
  const [message, setMessage] = useState('We detected uncommon login attempts or unauthorized access patterns on your student account. Please verify your identity and review active sessions.');

  const handleSend = () => {
    sendAlert.mutate(
      { userId: user.id, alertType, message, severity },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
            <Shield className="h-5 w-5" /> Dispatch Security Alert
          </DialogTitle>
          <DialogDescription>
            Transmit an official administrative security directive directly to <strong>{user.username}</strong> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-1.5">
            <Label>Alert Classification</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Suspicious Login Activity">Suspicious Login Activity</SelectItem>
                <SelectItem value="Account Compromise Advisory">Account Compromise Advisory</SelectItem>
                <SelectItem value="Terms & Policy Compliance Warning">Terms & Policy Compliance Warning</SelectItem>
                <SelectItem value="Routine Administrative Audit">Routine Administrative Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Severity Level</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Priority (Urgent Action Required)</SelectItem>
                <SelectItem value="medium">Medium Priority (Advisory Warning)</SelectItem>
                <SelectItem value="low">Low Priority (Informational)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Directive Message & Instructions</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[90px] p-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter security warning instructions for the student..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={sendAlert.isPending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sendAlert.isPending} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
            {sendAlert.isPending ? 'Transmitting...' : 'Dispatch Security Warning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { toast } = useToast();
  const [isRevoking, setIsRevoking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRevokeSessions = async () => {
    setIsRevoking(true);
    try {
      const res = await apiPost(`/api/admin/users/${userId}/revoke-sessions`);
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Sessions Revoked', description: 'User has been force-kicked from all active sessions.' });
      } else {
        throw new Error(data.message || 'Revocation failed');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to revoke sessions', variant: 'destructive' });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleResetRecovery = async () => {
    setIsResetting(true);
    try {
      const res = await apiPost(`/api/admin/users/${userId}/reset-recovery-questions`);
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Recovery Reset', description: 'Security questions reset. User can now re-enroll.' });
      } else {
        throw new Error(data.message || 'Reset failed');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reset recovery questions', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">360° Student Analytics & Governance Drawer</DialogTitle>
          <DialogDescription>
            Live session diagnostics, gamification footprint, and emergency account intervention controls.
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
            {/* Governance Actions & Live Session Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Active JWT Sessions:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-mono text-xs">
                    {activityData.activeSessionsCount ?? 'N/A'} active token(s)
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Force-eviction clears all refresh tokens across mobile and browser devices.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={handleRevokeSessions} disabled={isRevoking}>
                  {isRevoking ? 'Revoking...' : 'Force Kick / Revoke Sessions'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetRecovery} disabled={isResetting}>
                  {isResetting ? 'Resetting...' : 'Reset Recovery Questions'}
                </Button>
              </div>
            </div>

            {/* Gamification Stats */}
            {activityData.gamification && (
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500">Gamification & Engagement Standing</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">Level {activityData.gamification.level || 1}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Level</p>
                  </div>
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{(activityData.gamification.totalPoints ?? activityData.gamification.xpPoints ?? 0).toLocaleString()} XP</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total XP Earned</p>
                  </div>
                  <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{activityData.gamification.streakDays || 0} days</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Streak</p>
                  </div>
                  <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{activityData.gamification.longestStreak || 0} days</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Longest Streak</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Created Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500">Full Content Footprint</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{activityData.contentCreated.quizzes}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Quizzes</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{activityData.contentCreated.flashcards}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Flashcards</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{activityData.contentCreated.documents}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Documents</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{activityData.contentCreated.questions}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{activityData.contentCreated.chatMessages || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">AI Chat Messages</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{activityData.contentCreated.codeSnippets || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Code Snippets</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-center sm:col-span-2">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{activityData.contentCreated.studyPlans || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Active Study Plans</p>
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
