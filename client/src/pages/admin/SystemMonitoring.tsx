import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
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
  Play,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  Network,
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
  tokensConsumed?: number;
  usedQuota?: number;
  totalQuota?: number;
  quotaLimit?: number;
  quotaRemaining: number;
  usagePercentage?: number;
  percentageUsed?: number;
  avgResponseTimeMs?: number;
  maxQuizzesPerHourPerUser?: number;
  maxQuestionsPerQuiz?: number;
  models?: Array<{ model: string; requests: number; tokens: number }>;
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
    <div className="flex-1 flex flex-col min-h-[calc(100vh-6rem)] -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 bg-background space-y-4 overflow-y-auto">
      {/* AI Quota Card - Requirement 13.10 */}
      <div className="flex-shrink-0">
        <AIQuotaCard />
      </div>

      {/* Tabs for different log types - Requirements 13.1, 13.2 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col space-y-4">
        <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
          <TabsTrigger value="security" className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <Shield className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Security Logs</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Email Logs</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Error Logs</span>
          </TabsTrigger>
          <TabsTrigger value="api-usage" className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">API Usage</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="m-0 data-[state=inactive]:hidden">
          <SecurityLogsTable />
        </TabsContent>

        <TabsContent value="email" className="m-0 data-[state=inactive]:hidden">
          <EmailLogsTable />
        </TabsContent>

        <TabsContent value="errors" className="m-0 data-[state=inactive]:hidden">
          <ErrorLogsTable />
        </TabsContent>

        <TabsContent value="api-usage" className="m-0 data-[state=inactive]:hidden">
          <APIUsageLogsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AI Quota Card Component - Requirement 13.10
function AIQuotaCard() {
  const { data, isLoading } = useAIQuota();
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testPipelineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth('/api/admin/system/ai-quota/test', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'AI diagnostic request failed' }));
        throw new Error(err.message || 'Diagnostic failed');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: '⚡ AI Quota Pipeline Tested',
        description: data.message || 'Real token consumption recorded and latency verified.',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: any) => {
      toast({
        title: 'AI Diagnostic Test Failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const defaultQuota: AIQuotaData = {
    totalQuota: 2000000,
    usedQuota: 0,
    quotaRemaining: 2000000,
    usagePercentage: 0,
    totalRequests: 0,
    avgResponseTimeMs: 0,
    maxQuizzesPerHourPerUser: 10,
    maxQuestionsPerQuiz: 50,
    models: [
      { model: 'gemini-3.1-flash-lite-preview', requests: 0, tokens: 0 },
      { model: 'gemini-2.5-flash', requests: 0, tokens: 0 },
    ],
  };

  const quotaData: AIQuotaData = (data as any)?.data || (data as any) || defaultQuota;

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 bg-card border border-border/80 rounded-2xl animate-pulse h-14">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-pink-500 shrink-0" />
          <div className="h-4 w-44 bg-muted rounded" />
        </div>
        <div className="h-4 w-60 bg-muted rounded hidden sm:block" />
      </div>
    );
  }

  const tokensUsed = quotaData.usedQuota ?? quotaData.tokensConsumed ?? 0;
  const totalQuota = quotaData.totalQuota || 2000000;
  const rawPct = (tokensUsed / totalQuota) * 100;
  const displayPercentageText = tokensUsed > 0 ? (rawPct < 0.01 ? `${rawPct.toFixed(4)}%` : `${rawPct.toFixed(2)}%`) : '0.0%';
  const isHighUsage = rawPct > 80;
  // Ensure visual progress indicator shows clearly (at least 3% width) whenever any tokens have been consumed
  const visualProgress = tokensUsed > 0 ? Math.max(3, Math.min(100, rawPct)) : 0;
  const remainingAllowance = (quotaData as any).remainingQuota ?? quotaData.quotaRemaining ?? Math.max(0, totalQuota - tokensUsed);

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xs transition-all overflow-hidden">
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 font-extrabold text-foreground">
          <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-600 dark:text-pink-400">
            <Cpu className="h-4 w-4" />
          </div>
          <span>AI Quota: <span className={isHighUsage ? "text-red-500" : "text-emerald-500"}>{displayPercentageText} Used</span></span>
          <span className="text-xs font-medium text-muted-foreground hidden md:inline">({tokensUsed.toLocaleString()} / {totalQuota.toLocaleString()} tokens)</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold text-muted-foreground">
          <div className="hidden sm:flex items-center gap-2">
            <span>Requests: <b className="text-foreground font-mono">{(quotaData.totalRequests || 0).toLocaleString()}</b></span>
            <span>•</span>
            <span>Avg Latency: <b className="text-foreground font-mono">{quotaData.avgResponseTimeMs ? `${quotaData.avgResponseTimeMs}ms` : 'N/A'}</b></span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => testPipelineMutation.mutate()}
            disabled={testPipelineMutation.isPending}
            className="h-7 px-2.5 text-xs font-extrabold text-pink-600 dark:text-pink-400 border-pink-500/30 hover:bg-pink-500/10 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
            title="Perform a live AI diagnostic generation and simulate real token consumption"
          >
            {testPipelineMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span className="hidden sm:inline">Test AI Quota Pipeline</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 px-2.5 text-xs font-extrabold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1">
            {expanded ? <>Hide Details <ChevronUp className="h-3.5 w-3.5" /></> : <>View Diagnostics <ChevronDown className="h-3.5 w-3.5" /></>}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-muted/20 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Monthly Token Consumption Allowance</span>
              <span className="text-emerald-500 font-mono font-extrabold">{displayPercentageText} <span className="text-muted-foreground font-normal">({tokensUsed.toLocaleString()} tokens used)</span></span>
            </div>
            <Progress 
              value={visualProgress} 
              className={cn(
                "h-3 rounded-full bg-muted/70 border border-border/60 shadow-inner", 
                isHighUsage 
                  ? "[&>div]:bg-rose-500" 
                  : "[&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:via-purple-500 [&>div]:to-indigo-500 [&>div]:transition-all [&>div]:duration-500"
              )} 
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-background rounded-xl border border-border/60 text-center">
              <div className="text-base font-black text-foreground font-mono">{(quotaData.totalRequests || 0).toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">Total API Requests</div>
            </div>
            <div className="p-2.5 bg-background rounded-xl border border-border/60 text-center">
              <div className="text-base font-black text-foreground font-mono">{tokensUsed.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">Tokens Consumed</div>
            </div>
            <div className="p-2.5 bg-background rounded-xl border border-border/60 text-center">
              <div className="text-base font-black text-foreground font-mono">{remainingAllowance.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">Remaining Allowance</div>
            </div>
            <div className="p-2.5 bg-background rounded-xl border border-border/60 text-center">
              <div className="text-base font-black text-foreground font-mono">{quotaData.avgResponseTimeMs ? `${quotaData.avgResponseTimeMs}ms` : 'N/A'}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">Avg Response Time</div>
            </div>
          </div>

          {quotaData.models && quotaData.models.length > 0 && (
            <div>
              <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-2">Model Invocation & Failover Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quotaData.models.map(m => (
                  <div key={m.model} className="flex justify-between items-center p-2 bg-background rounded-lg border border-border/60 text-xs">
                    <span className="font-mono font-bold text-foreground">{m.model}</span>
                    <span className="text-muted-foreground font-medium">{m.requests} calls ({m.tokens.toLocaleString()} tokens)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
  const total = (data as any)?.data?.pagination?.total ?? (data as any)?.data?.total ?? logs.length;
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
    <div className="flex flex-col space-y-4 min-h-[450px]">
      {/* Filters - Requirements 13.3, 13.4, 13.5 */}
      <div className="flex-shrink-0">
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
          onExport={handleExport}
          isExportDisabled={isLoading || logs.length === 0}
        />
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
  const total = (data as any)?.data?.pagination?.total ?? (data as any)?.data?.total ?? logs.length;
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
    <div className="flex flex-col space-y-4 min-h-[450px]">
      {/* Filters - Requirements 13.3, 13.4, 13.6 */}
      <div className="flex-shrink-0">
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
          onExport={handleExport}
          isExportDisabled={isLoading || logs.length === 0}
        />
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
  const queryClient = useQueryClient();

  const simulateErrorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth('/api/admin/system/error-logs/simulate', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Simulation request failed' }));
        throw new Error(err.message || 'Simulation failed');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: '🔴 Simulated System Exception Logged',
        description: data.message || 'Error recorded in database and alert pipeline tested!',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Error Simulation Failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const { data, isLoading, error } = useErrorLogs({
    page,
    limit,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(userId && { userId: parseInt(userId) }),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.pagination?.total ?? (data as any)?.data?.total ?? logs.length;
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
    <div className="flex flex-col space-y-4 min-h-[450px]">
      {/* Enterprise Error Simulation Banner */}
      <div className="flex-shrink-0 bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 border border-rose-500/20 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="font-extrabold text-sm text-foreground">Enterprise Error & Exception Diagnostics</h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Real-time monitoring of failed authentication handshakes, AI model timeout events, database pool retries, and SMTP mail relay errors.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => simulateErrorMutation.mutate()}
            disabled={simulateErrorMutation.isPending}
            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4 py-2 h-9 rounded-xl shadow-xs transition-transform active:scale-95 shrink-0 flex items-center gap-2"
          >
            {simulateErrorMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Simulate System Error
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters - Requirements 13.3, 13.4 */}
      <div className="flex-shrink-0">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onUserIdChange={setUserId}
          onExport={handleExport}
          isExportDisabled={isLoading || logs.length === 0}
        />
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
  const total = (data as any)?.data?.pagination?.total ?? (data as any)?.data?.total ?? logs.length;
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
    <div className="flex flex-col space-y-4 min-h-[450px]">
      {/* Filters - Requirements 13.3, 13.4 */}
      <div className="flex-shrink-0">
        <LogFilters
          startDate={startDate}
          endDate={endDate}
          userId={userId}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onUserIdChange={setUserId}
          onExport={handleExport}
          isExportDisabled={isLoading || logs.length === 0}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load API usage logs. Please try again.
          </p>
        </div>
      )}

      {/* Dedicated AI Usage table */}
      <AIUsageTable
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
  onExport?: () => void;
  isExportDisabled?: boolean;
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
  onExport,
  isExportDisabled,
}: LogFiltersProps) {
  return (
    <div className="p-3 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
        <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-xl w-full sm:w-auto text-xs">
          <span className="text-muted-foreground font-extrabold whitespace-nowrap">From:</span>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="border-0 p-0 h-6 text-xs w-32 focus-visible:ring-0 bg-transparent font-medium"
          />
        </div>
        
        <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-xl w-full sm:w-auto text-xs">
          <span className="text-muted-foreground font-extrabold whitespace-nowrap">To:</span>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="border-0 p-0 h-6 text-xs w-32 focus-visible:ring-0 bg-transparent font-medium"
          />
        </div>

        <div className="w-full sm:w-36">
          <Input
            id="user-id"
            type="number"
            placeholder="Filter User ID..."
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            className="h-8 text-xs rounded-xl bg-background border-border font-medium"
          />
        </div>

        {showActionFilter && onActionChange && (
          <div className="w-full sm:w-44">
            <Select value={action || "all"} onValueChange={(val) => onActionChange(val === "all" ? "" : val)}>
              <SelectTrigger id="action" className="h-8 text-xs rounded-xl bg-background font-extrabold border-border">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">All actions</SelectItem>
                <SelectItem value="admin_login" className="text-xs">Admin Login</SelectItem>
                <SelectItem value="admin_logout" className="text-xs">Admin Logout</SelectItem>
                <SelectItem value="user_update" className="text-xs">User Update</SelectItem>
                <SelectItem value="user_suspend" className="text-xs">User Suspend</SelectItem>
                <SelectItem value="user_activate" className="text-xs">User Activate</SelectItem>
                <SelectItem value="user_delete" className="text-xs">User Delete</SelectItem>
                <SelectItem value="content_update" className="text-xs">Content Update</SelectItem>
                <SelectItem value="content_delete" className="text-xs">Content Delete</SelectItem>
                <SelectItem value="role_change" className="text-xs">Role Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {showStatusFilter && onStatusChange && (
          <div className="w-full sm:w-40">
            <Select value={status || "all"} onValueChange={(val) => onStatusChange(val === "all" ? "" : val)}>
              <SelectTrigger id="status" className="h-8 text-xs rounded-xl bg-background font-extrabold border-border">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">All statuses</SelectItem>
                <SelectItem value="success" className="text-xs">Success</SelectItem>
                <SelectItem value="failure" className="text-xs">Failure</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExportDisabled}
          className="h-8 px-3.5 text-xs font-extrabold rounded-xl shrink-0 border-border bg-background shadow-xs hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
          Export CSV
        </Button>
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
    <div className="flex flex-col space-y-4 min-h-[400px]">
      {/* Table - Desktop View */}
      <div className="hidden md:block overflow-x-auto bg-card rounded-2xl border border-border/80 shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border/80">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">Timestamp</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">User / Origin</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">Action / Event</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-2.5 w-16" /></div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-32 rounded-xl" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-xl" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28 rounded-xl" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-semibold">
                  No audit or event logs found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <React.Fragment key={log.id}>
                  <TableRow 
                    className={cn(
                      'cursor-pointer hover:bg-muted/40 transition-colors',
                      highlightErrors && log.status === 'failure' && 'bg-rose-500/5 border-l-4 border-rose-500'
                    )}
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-muted">
                        {expandedRow === log.id ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span>{formatTimestamp(log.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-xs shadow-2xs">
                          {log.username ? log.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-foreground tracking-tight">
                            {log.username || 'System Account'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {log.userId && (
                              <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                ID: {log.userId}
                              </span>
                            )}
                            {log.userRole && (
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                {log.userRole}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-500/5 dark:bg-slate-400/5 border-slate-500/20 text-slate-700 dark:text-slate-300">
                        {log.action ? log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'System Event'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Modern High-Visibility Status Pill */}
                      <Badge
                        className={cn(
                          'font-black text-xs px-3 py-1 rounded-xl border flex items-center gap-1.5 w-fit shadow-2xs transition-transform hover:scale-105',
                          log.status === 'success' || log.status === 'sent'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        )}
                      >
                        {log.status === 'success' || log.status === 'sent' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        )}
                        <span className="uppercase tracking-wider">{log.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-muted/50 border border-border/80 rounded-xl px-2.5 py-1 text-muted-foreground w-fit whitespace-nowrap">
                        <Network className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span>{log.ipAddress || 'Internal (System Execution)'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable row for log details - Requirement 13.7 */}
                  {expandedRow === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 border-b border-border">
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.userAgent && (
                              <div>
                                <p className="text-[11px] font-black uppercase text-muted-foreground mb-1">
                                  User Agent / Client Identifier
                                </p>
                                <p className="text-xs font-mono text-foreground/90 bg-card p-2.5 rounded-xl border border-border/80 break-all">
                                  {log.userAgent}
                                </p>
                              </div>
                            )}
                            
                            {log.details && (
                              <div>
                                <p className="text-[11px] font-black uppercase text-muted-foreground mb-1">
                                  Telemetry & Event Details
                                </p>
                                <pre className="text-xs font-mono text-foreground/90 bg-card p-2.5 rounded-xl border border-border/80 overflow-x-auto max-h-[200px]">
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

      {/* Mobile Responsive Card Layout */}
      <div className="block md:hidden space-y-3.5">
        {isLoading ? (
          Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3 border-border/80 rounded-2xl">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed font-semibold text-sm">
            No system logs recorded for this filter criteria.
          </div>
        ) : (
          logs.map((log: any) => (
            <Card key={log.id} className={cn(
              "p-4 space-y-3.5 border-border/80 rounded-2xl shadow-xs transition-all bg-card",
              highlightErrors && log.status === 'failure' && "border-rose-500/50 bg-rose-500/5"
            )}>
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <Badge
                  className={cn(
                    'font-black text-[10px] px-2.5 py-0.5 rounded-lg border flex items-center gap-1 w-fit shadow-2xs',
                    log.status === 'success' || log.status === 'sent'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  )}
                >
                  {log.status === 'success' || log.status === 'sent' ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0 text-rose-500" />
                  )}
                  <span className="uppercase">{log.status}</span>
                </Badge>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0 text-primary/70" />
                  <span>{formatTimestamp(log.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-xs">
                    {log.username ? log.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-foreground">
                      {log.username || 'System Account'}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {log.userId && <Badge variant="outline" className="text-[9px] py-0 font-mono font-bold bg-muted">ID: {log.userId}</Badge>}
                      {log.userRole && <Badge variant="outline" className="text-[9px] font-black uppercase py-0 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{log.userRole}</Badge>}
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-500/5 dark:bg-slate-400/5 border-slate-500/20 text-slate-700 dark:text-slate-300">
                  {log.action ? log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Event'}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold bg-muted/50 border border-border/80 rounded-xl px-2.5 py-1 text-muted-foreground w-full">
                <Network className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span>IP: {log.ipAddress || 'Internal (System Execution)'}</span>
              </div>

              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRow(log.id)}
                  className="w-full h-8 text-xs font-extrabold flex items-center justify-center gap-1.5 bg-muted/30 hover:bg-muted rounded-xl"
                >
                  {expandedRow === log.id ? (
                    <>Hide Payload Inspection <ChevronUp className="h-3.5 w-3.5 text-primary" /></>
                  ) : (
                    <>Inspect Payload & Agent <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></>
                  )}
                </Button>

                {expandedRow === log.id && (
                  <div className="mt-3 p-3 bg-muted/40 rounded-xl space-y-2.5 text-xs overflow-hidden border border-border/60">
                    {log.userAgent && (
                      <div>
                        <p className="font-black text-[10px] text-muted-foreground uppercase">User Agent</p>
                        <p className="font-mono text-[11px] break-all text-foreground/90 mt-0.5">{log.userAgent}</p>
                      </div>
                    )}
                    {log.details && (
                      <div>
                        <p className="font-black text-[10px] text-muted-foreground uppercase mb-1">Telemetry Payload</p>
                        <pre className="text-[11px] font-mono bg-background/80 p-2.5 rounded-lg border border-border/80 overflow-x-auto max-h-[200px]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination & Row Count Footer - Requirement 13.8 */}
      {!isLoading && (
        <div className="flex-shrink-0 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-muted-foreground">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </p>
            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span className="text-xs font-bold text-muted-foreground">Rows:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  onLimitChange(parseInt(value));
                  onPageChange(1);
                }}
              >
                <SelectTrigger className="w-16 h-7 text-xs font-extrabold rounded-lg bg-background border-border">
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

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-extrabold rounded-lg"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-bold text-muted-foreground px-1">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-extrabold rounded-lg"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dedicated AI Usage Logs Table with Model Routing, Token Counts & Latency Displays
function AIUsageTable({
  logs,
  isLoading,
  limit,
  page,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: LogTableProps) {
  return (
    <div className="flex flex-col space-y-4 min-h-[400px]">
      {/* Table - Desktop View */}
      <div className="hidden md:block overflow-x-auto bg-card rounded-2xl border border-border/80 shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border/80">
            <TableRow>
              <TableHead className="w-[180px] font-extrabold text-xs uppercase text-muted-foreground">Timestamp</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">User / Origin</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">Endpoint / Action</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground">AI Model Utilized</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground text-right">Tokens Consumed</TableHead>
              <TableHead className="font-extrabold text-xs uppercase text-muted-foreground text-right">Execution Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48 rounded-lg" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-semibold">
                  No AI API usage logs found for this filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => {
                const modelName = log.model || 'gemini-3.1-flash-lite-preview';
                const tokens = log.tokensUsed !== undefined ? log.tokensUsed : 0;
                const duration = log.durationMs !== undefined ? log.durationMs : 0;
                const endpoint = log.endpoint || log.action || 'generate_content';

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-extrabold text-foreground">
                        {log.username || (log.userId ? `User #${log.userId}` : 'AI System Pipeline')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 text-xs font-extrabold px-2 py-0.5 rounded-lg">
                        {endpoint}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 inline-block">
                        {modelName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>{tokens.toLocaleString()} tokens</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-sm text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span>{duration}ms</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Responsive Card Layout */}
      <div className="block md:hidden space-y-3.5">
        {isLoading ? (
          Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3 border-border/80 rounded-2xl">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </Card>
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed font-semibold text-sm">
            No AI API usage logs recorded for this filter criteria.
          </div>
        ) : (
          logs.map((log: any) => {
            const modelName = log.model || 'gemini-3.1-flash-lite-preview';
            const tokens = log.tokensUsed !== undefined ? log.tokensUsed : 0;
            const duration = log.durationMs !== undefined ? log.durationMs : 0;
            const endpoint = log.endpoint || log.action || 'generate_content';

            return (
              <Card key={log.id} className="p-4 space-y-3 border-border/80 rounded-2xl shadow-xs bg-card">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 text-[11px] font-black px-2 py-0.5 rounded-lg">
                    {endpoint}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-semibold whitespace-nowrap">
                    {formatTimestamp(log.createdAt)}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1.5">
                    Origin: <span className="text-foreground font-extrabold">{log.username || (log.userId ? `User #${log.userId}` : 'AI System Pipeline')}</span>
                  </div>
                  <div className="inline-block font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 w-full text-center">
                    {modelName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                  <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-1.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                    <Cpu className="h-3.5 w-3.5 shrink-0" />
                    <span>{tokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-center gap-1.5 font-mono font-black text-amber-600 dark:text-amber-400">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span>{duration}ms</span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && (
        <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-muted-foreground">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </p>
            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span className="text-xs font-bold text-muted-foreground">Rows:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  onLimitChange(parseInt(value));
                  onPageChange(1);
                }}
              >
                <SelectTrigger className="w-16 h-7 text-xs font-extrabold rounded-lg bg-background border-border">
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

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-extrabold rounded-lg"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-bold text-muted-foreground px-1">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-extrabold rounded-lg"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
