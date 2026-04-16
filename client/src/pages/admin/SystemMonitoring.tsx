import React, { useState } from 'react';
import {
  useSecurityLogs,
  useEmailLogs,
  useErrorLogs,
  useAPIUsageLogs,
  useAIQuota,
} from '@/hooks/useAdminQuery';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Mail,
  AlertTriangle,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportLogsToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';

// Types
interface AuditLog {
  id: number;
  userId?: number;
  username?: string;
  action: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  createdAt: string;
}

interface AIQuotaData {
  totalRequests: number;
  tokensConsumed: number;
  quotaLimit: number;
  quotaRemaining: number;
  percentageUsed: number;
}

// Format timestamp helper
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SystemMonitoring() {
  const [activeTab, setActiveTab] = useState('security');
  
  return (
    <div className="space-y-6">
      {/* AI Quota Card - Requirement 13.10 */}
      <AIQuotaCard />

      {/* Tabs for different log types - Requirements 13.1, 13.2 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Logs
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error Logs
          </TabsTrigger>
          <TabsTrigger value="api-usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            API Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <SecurityLogsTable />
        </TabsContent>

        <TabsContent value="email">
          <EmailLogsTable />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorLogsTable />
        </TabsContent>

        <TabsContent value="api-usage">
          <APIUsageLogsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AI Quota Card Component - Requirement 13.10
function AIQuotaCard() {
  const { data, isLoading } = useAIQuota();
  const quotaData = (data as any)?.data as AIQuotaData | undefined;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-pink-500" />
            AI Quota Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!quotaData) return null;

  const percentageUsed = quotaData.percentageUsed || 0;
  const isHighUsage = percentageUsed > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-pink-500" />
          AI Quota Usage
        </CardTitle>
        <CardDescription>
          Monitor AI API usage and remaining quota
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Quota Used</span>
            <span className={cn(
              'font-semibold',
              isHighUsage ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
            )}>
              {percentageUsed.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={percentageUsed} 
            className={cn(
              'h-3',
              isHighUsage && '[&>div]:bg-red-500'
            )}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {(quotaData.totalRequests || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Requests</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {(quotaData.tokensConsumed || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Tokens Used</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {(quotaData.quotaRemaining || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Remaining</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Security Logs Table Component - Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8
function SecurityLogsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const { toast } = useToast();

  const { data, isLoading, error } = useSecurityLogs({
    page,
    limit,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(userId && { userId: parseInt(userId) }),
    ...(action && { action }),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle CSV export
  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no security logs to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `security-logs-export-${timestamp}.csv`;
      exportLogsToCSV(logs, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${logs.length} security logs to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export security logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters - Requirements 13.3, 13.4, 13.5 */}
      <div className="flex items-center justify-between">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
          action={action}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onUserIdChange={setUserId}
          onActionChange={setAction}
          showActionFilter
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isLoading || logs.length === 0}
          title="Export to CSV"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load security logs. Please try again.
          </p>
        </div>
      )}

      {/* Logs table - Requirements 13.2, 13.7, 13.8 */}
      <LogTable
        logs={logs}
        isLoading={isLoading}
        limit={limit}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}

// Email Logs Table Component - Requirements 13.1, 13.2, 13.3, 13.4, 13.6, 13.7, 13.8
function EmailLogsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  const { data, isLoading, error } = useEmailLogs({
    page,
    limit,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(userId && { userId: parseInt(userId) }),
    ...(status && { status }),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle CSV export
  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no email logs to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `email-logs-export-${timestamp}.csv`;
      exportLogsToCSV(logs, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${logs.length} email logs to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export email logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters - Requirements 13.3, 13.4, 13.6 */}
      <div className="flex items-center justify-between">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
          status={status}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onUserIdChange={setUserId}
          onStatusChange={setStatus}
          showStatusFilter
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isLoading || logs.length === 0}
          title="Export to CSV"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load email logs. Please try again.
          </p>
        </div>
      )}

      {/* Logs table - Requirements 13.2, 13.7, 13.8 */}
      <LogTable
        logs={logs}
        isLoading={isLoading}
        limit={limit}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}

// Error Logs Table Component - Requirements 13.1, 13.2, 13.3, 13.4, 13.7, 13.8, 13.9
function ErrorLogsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const { toast } = useToast();

  const { data, isLoading, error } = useErrorLogs({
    page,
    limit,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(userId && { userId: parseInt(userId) }),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle CSV export
  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no error logs to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `error-logs-export-${timestamp}.csv`;
      exportLogsToCSV(logs, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${logs.length} error logs to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export error logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters - Requirements 13.3, 13.4 */}
      <div className="flex items-center justify-between">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onUserIdChange={setUserId}
      />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isLoading || logs.length === 0}
          title="Export to CSV"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load error logs. Please try again.
          </p>
        </div>
      )}

      {/* Logs table - Requirements 13.2, 13.7, 13.8, 13.9 */}
      <LogTable
        logs={logs}
        isLoading={isLoading}
        limit={limit}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
        highlightErrors
      />
    </div>
  );
}

// API Usage Logs Table Component - Requirements 13.1, 13.2, 13.3, 13.4, 13.7, 13.8
function APIUsageLogsTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const { toast } = useToast();

  const { data, isLoading, error } = useAPIUsageLogs({
    page,
    limit,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(userId && { userId: parseInt(userId) }),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handle CSV export
  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no API usage logs to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `api-usage-logs-export-${timestamp}.csv`;
      exportLogsToCSV(logs, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${logs.length} API usage logs to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export API usage logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters - Requirements 13.3, 13.4 */}
      <div className="flex items-center justify-between">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
          onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onUserIdChange={setUserId}
      />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isLoading || logs.length === 0}
          title="Export to CSV"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load API usage logs. Please try again.
          </p>
        </div>
      )}

      {/* Logs table - Requirements 13.2, 13.7, 13.8 */}
      <LogTable
        logs={logs}
        isLoading={isLoading}
        limit={limit}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}

// Log Filters Component - Requirements 13.3, 13.4, 13.5, 13.6
interface LogFiltersProps {
  startDate: string;
  endDate: string;
  userId: string;
  action?: string;
  status?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onActionChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  showActionFilter?: boolean;
  showStatusFilter?: boolean;
}

function LogFilters({
  startDate,
  endDate,
  userId,
  action,
  status,
  onStartDateChange,
  onEndDateChange,
  onUserIdChange,
  onActionChange,
  onStatusChange,
  showActionFilter,
  showStatusFilter,
}: LogFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Date Range Filter - Requirement 13.3 */}
      <div className="space-y-2">
        <Label htmlFor="start-date" className="text-xs">Start Date</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="text-sm"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="end-date" className="text-xs">End Date</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* User Filter - Requirement 13.4 */}
      <div className="space-y-2">
        <Label htmlFor="user-id" className="text-xs">User ID</Label>
        <Input
          id="user-id"
          type="number"
          placeholder="Filter by user ID"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Action Type Filter - Requirement 13.5 */}
      {showActionFilter && onActionChange && (
        <div className="space-y-2">
          <Label htmlFor="action" className="text-xs">Action Type</Label>
          <Select value={action || "all"} onValueChange={(val) => onActionChange(val === "all" ? "" : val)}>
            <SelectTrigger id="action" className="text-sm">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="admin_login">Admin Login</SelectItem>
              <SelectItem value="admin_logout">Admin Logout</SelectItem>
              <SelectItem value="user_update">User Update</SelectItem>
              <SelectItem value="user_suspend">User Suspend</SelectItem>
              <SelectItem value="user_activate">User Activate</SelectItem>
              <SelectItem value="user_delete">User Delete</SelectItem>
              <SelectItem value="content_update">Content Update</SelectItem>
              <SelectItem value="content_delete">Content Delete</SelectItem>
              <SelectItem value="role_change">Role Change</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status Filter - Requirement 13.6 */}
      {showStatusFilter && onStatusChange && (
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select value={status || "all"} onValueChange={(val) => onStatusChange(val === "all" ? "" : val)}>
            <SelectTrigger id="status" className="text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Log Table Component - Requirements 13.2, 13.7, 13.8, 13.9
interface LogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  highlightErrors?: boolean;
}

function LogTable({
  logs,
  isLoading,
  limit,
  page,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  highlightErrors,
}: LogTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Page size selector */}
      <div className="flex items-center justify-end gap-2">
        <Label htmlFor="page-size" className="text-sm text-gray-600 dark:text-gray-400">
          Show:
        </Label>
        <Select
          value={limit.toString()}
          onValueChange={(value) => {
            onLimitChange(parseInt(value));
            onPageChange(1);
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

      {/* Table - Requirements 13.2, 13.7 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow 
                    className={cn(
                      'cursor-pointer',
                      highlightErrors && log.status === 'failure' && 'bg-red-50 dark:bg-red-900/10'
                    )}
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {expandedRow === log.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {log.username || 'Unknown'}
                        </span>
                        {log.userId && (
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {log.userId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {log.action ? log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* Status Badge - Requirement 13.9 */}
                      <Badge
                        variant={log.status === 'success' ? 'default' : 'destructive'}
                        className={cn(
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {log.ipAddress || 'N/A'}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable row for log details - Requirement 13.7 */}
                  {expandedRow === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-900/50">
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.userAgent && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  User Agent
                                </p>
                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                                  {log.userAgent}
                                </p>
                              </div>
                            )}
                            
                            {log.details && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  Details
                                </p>
                                <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Requirement 13.8 */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
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
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
