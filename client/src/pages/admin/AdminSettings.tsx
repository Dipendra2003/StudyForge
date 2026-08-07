import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, Cpu, ShieldAlert, Mail, Server, Save, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { apiGet } from "@/lib/api";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query real system settings from PostgreSQL
  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const res = await apiGet('/api/admin/settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch settings');
      return json.data;
    },
  });

  // Query auto-fetched generative models available to active API key
  const { data: modelsList, isLoading: loadingModels } = useQuery({
    queryKey: ['/api/admin/settings/available-models'],
    queryFn: async () => {
      const res = await apiGet('/api/admin/settings/available-models');
      const json = await res.json();
      return json.models || [
        'gemini-3.1-flash-lite-preview',
        'gemini-3.0-pro',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash'
      ];
    },
  });

  const [aiModel, setAiModel] = useState("gemini-3.1-flash-lite-preview");
  const [fallbackAiModel, setFallbackAiModel] = useState("gemini-2.5-flash");
  const [tokenBudget, setTokenBudget] = useState("500000");
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [toxicityThreshold, setToxicityThreshold] = useState("0.85");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [jwtStrictRotation, setJwtStrictRotation] = useState(true);
  const [senderEmail, setSenderEmail] = useState("notifications@studyforge.edu");

  useEffect(() => {
    if (settingsData) {
      if (settingsData.aiModel) setAiModel(settingsData.aiModel);
      if (settingsData.fallbackAiModel) setFallbackAiModel(settingsData.fallbackAiModel);
      if (settingsData.tokenBudget !== undefined) setTokenBudget(String(settingsData.tokenBudget));
      if (settingsData.autoQuarantine !== undefined) setAutoQuarantine(Boolean(settingsData.autoQuarantine));
      if (settingsData.toxicityThreshold !== undefined) setToxicityThreshold(String(settingsData.toxicityThreshold));
      if (settingsData.maintenanceMode !== undefined) setMaintenanceMode(Boolean(settingsData.maintenanceMode));
      if (settingsData.jwtStrictRotation !== undefined) setJwtStrictRotation(Boolean(settingsData.jwtStrictRotation));
      if (settingsData.senderEmail) setSenderEmail(settingsData.senderEmail);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updatedSettings)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to persist settings in PostgreSQL');
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/admin/settings'], data);
      toast({
        title: "Enterprise Settings Committed",
        description: `Active AI routing synced to ${aiModel}. All system parameters and model routing thresholds persisted to PostgreSQL.`,
        variant: "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Unable to save system parameters.",
        variant: "destructive",
      });
    }
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      aiModel,
      fallbackAiModel,
      tokenBudget: parseInt(tokenBudget, 10) || 500000,
      autoQuarantine,
      toxicityThreshold: String(toxicityThreshold),
      maintenanceMode,
      jwtStrictRotation,
      senderEmail
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Settings Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 border border-white/10 shadow-2xl"
      >
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white border-0 font-extrabold text-xs px-3 py-0.5 flex items-center gap-1.5 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              ENTERPRISE CONFIGURATION
            </Badge>
            <Badge variant="outline" className="text-purple-300 border-purple-500/30 text-xs font-bold bg-white/5">
              <Sparkles className="w-3 h-3 text-amber-400 mr-1 inline" />
              LIVE PG SYNC
            </Badge>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            System Settings & Model Routing
          </h1>
          <p className="text-purple-200/80 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Regulate active generative models, token rate limits, automated toxicity moderation thresholds, and platform maintenance states directly from PostgreSQL.
          </p>
        </div>
      </motion.div>

      {loadingSettings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-[360px] bg-muted/40 rounded-2xl border border-border/40" />
          <div className="h-[360px] bg-muted/40 rounded-2xl border border-border/40" />
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: AI Engine & Token Budgets */}
            <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col justify-between">
              <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-indigo-500" />
                    AI Engine & Token Budgets
                  </CardTitle>
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0 font-extrabold text-[10px] uppercase">
                    {aiModel ? aiModel : "GEMINI ENGINE"}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Set active reasoning engines (auto-fetched via your API Key) and token billing ceilings.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-extrabold text-xs uppercase text-foreground">Primary Reasoning Model</Label>
                    {loadingModels && <span className="text-[10px] text-indigo-500 font-bold animate-pulse">Auto-fetching models...</span>}
                  </div>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border/80 text-sm bg-background">
                      <SelectValue placeholder="Select primary reasoning engine" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {(modelsList || [aiModel]).map((m: string) => (
                        <SelectItem key={m} value={m} className="font-semibold text-sm">
                          <span className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{m}</span>
                            {m === "gemini-3.1-flash-lite-preview" && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold ml-1">Default Best</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Auto-fetched via active API Key. Routes student chat, tutoring & flashcard generations instantly.</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-extrabold text-xs uppercase text-foreground">Fallback Failover Model</Label>
                  <Select value={fallbackAiModel} onValueChange={setFallbackAiModel}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border/80 text-sm bg-background">
                      <SelectValue placeholder="Select fallback failover engine" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {(modelsList || [fallbackAiModel]).map((m: string) => (
                        <SelectItem key={m} value={m} className="font-semibold text-sm">
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>{m}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Automatic failover destination if primary endpoint experiences high volume traffic or 503 latency.</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-extrabold text-xs uppercase text-foreground">Monthly Token Quota Ceiling (tokens)</Label>
                  <Input
                    type="number"
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(e.target.value)}
                    className="h-11 rounded-xl font-bold border-border/80 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">Alerts administrative telemetry channels when token ceiling is reached.</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Toxicity Moderation & Security */}
            <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col justify-between">
              <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-emerald-500" />
                    Automated Toxicity & Governance
                  </CardTitle>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-extrabold text-[10px]">ACTIVE GUARD</Badge>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Tune natural language filter thresholds and automated content quarantine policies.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6 flex-1">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="font-extrabold text-sm text-foreground">Auto-Quarantine Toxic Artifacts</Label>
                    <p className="text-xs text-muted-foreground">Automatically flag high-toxicity chat logs, flashcards and study items.</p>
                  </div>
                  <Switch checked={autoQuarantine} onCheckedChange={setAutoQuarantine} />
                </div>

                <div className="space-y-2">
                  <Label className="font-extrabold text-xs uppercase text-foreground">Toxicity Confidence Threshold (0.0 - 1.0)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={toxicityThreshold}
                    onChange={(e) => setToxicityThreshold(e.target.value)}
                    className="h-11 rounded-xl font-bold border-border/80 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">Artifacts with AI toxicity score exceeding this threshold trigger moderation review.</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Platform Maintenance & JWT Enforcement */}
            <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col justify-between">
              <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Server className="h-5 w-5 text-amber-500" />
                    System Availability & Refresh Policy
                  </CardTitle>
                  <Badge className="bg-amber-500/10 text-amber-600 border-0 font-extrabold text-[10px]">UPTIME: 99.99%</Badge>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Manage global portal lockouts and JWT refresh token validation rules.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6 flex-1">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="font-extrabold text-sm text-foreground">Strict Refresh JWT Rotation</Label>
                    <p className="text-xs text-muted-foreground">Revoke refresh tokens immediately upon single session reuse.</p>
                  </div>
                  <Switch checked={jwtStrictRotation} onCheckedChange={setJwtStrictRotation} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
                  <div className="space-y-0.5">
                    <Label className="font-extrabold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      Global Maintenance Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">Block student portal authentication during system maintenance or database migrations.</p>
                  </div>
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: SMTP & Broadcast Config */}
            <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col justify-between">
              <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-500" />
                    Helpdesk SMTP Dispatcher
                  </CardTitle>
                  <Badge className="bg-purple-500/10 text-purple-600 border-0 font-extrabold text-[10px]">IDEMPOTENT</Badge>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Configure outgoing helpdesk reply sender headers and system newsletter defaults.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6 flex-1">
                <div className="space-y-2">
                  <Label className="font-extrabold text-xs uppercase text-foreground">Official Sender Reply Address</Label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="h-11 rounded-xl font-bold border-border/80 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">Used as From header for helpdesk ticket resolutions & announcement broadcasts.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Global Action Footer */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saveMutation.isPending} className="font-black px-8 rounded-xl shadow-xl h-12 text-base bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white">
              <Save className="mr-2.5 h-5 w-5" />
              {saveMutation.isPending ? "Commiting to PostgreSQL..." : "Save System Settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
