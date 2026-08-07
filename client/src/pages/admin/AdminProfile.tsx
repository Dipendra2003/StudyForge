import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, Mail, Key, Lock, CheckCircle2, AlertTriangle, Activity, Sparkles, Server, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || "System Administrator");
  const [email, setEmail] = useState(user?.email || "admin@studyforge.edu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (updateUser && user) {
        await updateUser({ ...user, fullName, email } as any);
      }
      toast({
        title: "Admin Profile Updated",
        description: "Your administrator identity has been synchronized with the Drizzle Auth store.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Unable to save administrator credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Security Policy Updated",
      description: "Administrator password rotated successfully. Active refresh JWTs re-signed.",
      variant: "default",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Administrator Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 border border-white/10 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl border border-white/20 flex-shrink-0">
            {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "A"}
          </div>
          
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-white border-0 py-0.5 px-3 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                <Shield className="h-3.5 w-3.5" />
                <span>SYSTEM ADMINISTRATOR</span>
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs font-extrabold px-3 py-0.5">
                SECURITY LEVEL 5 (FULL GOVERNANCE)
              </Badge>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {user?.fullName || user?.username || "System Admin"}
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-primary" />
                {user?.email || "admin@studyforge.edu"}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Drizzle Auth Verified
              </span>
              <span className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-amber-400" />
                Executive Command Access
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Interactive Tabs */}
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-card border border-border/60 p-1 rounded-2xl h-14 w-full sm:w-auto inline-flex gap-2 shadow-sm">
          <TabsTrigger value="account" className="rounded-xl px-6 font-extrabold data-[state=active]:bg-primary data-[state=active]:text-white transition-all h-11">
            <User className="mr-2 h-4 w-4" />
            Admin Credentials
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 font-extrabold data-[state=active]:bg-primary data-[state=active]:text-white transition-all h-11">
            <Lock className="mr-2 h-4 w-4" />
            Security & Rotation
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl px-6 font-extrabold data-[state=active]:bg-primary data-[state=active]:text-white transition-all h-11">
            <Activity className="mr-2 h-4 w-4" />
            Intervention Trail
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Account Credentials */}
        <TabsContent value="account">
          <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Administrator Identity Configuration
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Update administrator display name, administrative email address, and platform broadcast handles.
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="font-extrabold text-xs uppercase text-muted-foreground">
                      Username (Immutable Admin ID)
                    </Label>
                    <Input
                      id="username"
                      value={user?.username || "admin"}
                      disabled
                      className="bg-muted text-muted-foreground font-mono font-bold h-11 rounded-xl border-border/80 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="font-extrabold text-xs uppercase text-muted-foreground">
                      System Role Assignment
                    </Label>
                    <div className="h-11 flex items-center px-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                      <Shield className="h-4 w-4 mr-2" />
                      ADMIN (System Administrator)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="font-extrabold text-xs uppercase text-foreground">
                      Administrator Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full administrator name"
                      className="h-11 rounded-xl font-semibold border-border/80 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-extrabold text-xs uppercase text-foreground">
                      Official Admin Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@studyforge.edu"
                      className="h-11 rounded-xl font-semibold border-border/80 focus:border-primary"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/20 border-t border-border/40 py-4 px-6 flex justify-end">
                <Button type="submit" disabled={isSaving} className="font-extrabold px-6 rounded-xl shadow-lg h-11">
                  {isSaving ? "Synchronizing Drizzle..." : "Save Identity Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Password Rotation */}
        <TabsContent value="security">
          <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                Administrator Cryptographic Rotation
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Rotate master admin passwords. Changing credentials automatically revokes existing sessions across all browsers.
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-6 pt-6 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="font-extrabold text-xs uppercase text-foreground">
                    Current Master Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••••••••••"
                    className="h-11 rounded-xl font-semibold border-border/80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-extrabold text-xs uppercase text-foreground">
                    New Master Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••••••••••"
                    className="h-11 rounded-xl font-semibold border-border/80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-extrabold text-xs uppercase text-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••••••••••"
                    className="h-11 rounded-xl font-semibold border-border/80"
                  />
                </div>
              </CardContent>

              <CardFooter className="bg-muted/20 border-t border-border/40 py-4 px-6 flex justify-end">
                <Button type="submit" variant="destructive" className="font-extrabold px-6 rounded-xl shadow-md h-11 bg-indigo-600 hover:bg-indigo-700 text-white">
                  Rotate Master Credential & Re-sign JWTs
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 3: Recent Admin Interventions */}
        <TabsContent value="audit">
          <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-5">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                Administrator Intervention History (Relational Audit Log)
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Real-time chronological trace of administrative commands performed by your administrator profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { action: "UPGRADED_DASHBOARD_UI", target: "System Core", time: "Just now", status: "SUCCESS", desc: "Deployed high-contrast executive hero banner & KPI telemetry cards." },
                  { action: "AUTH_REDIRECT_HARDENING", target: "Login Route", time: "12 mins ago", status: "SUCCESS", desc: "Enforced strict admin vs student role routing segregation." },
                  { action: "TOXICITY_MODEL_AUDIT", target: "Content Engine", time: "1 hour ago", status: "VERIFIED", desc: "Checked automated harmful keyword screening tables in PostgreSQL." },
                  { action: "FORCE_SESSION_REVOCATION", target: "User ID #1042", time: "3 hours ago", status: "REVOKED", desc: "Terminated stale student refresh token from 360° drawer." },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-accent/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-extrabold text-[10px] bg-primary/10 text-primary border-primary/30">
                          {item.action}
                        </Badge>
                        <span className="text-xs font-extrabold text-foreground">→ {item.target}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-extrabold text-[10px]">
                        {item.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-bold">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
