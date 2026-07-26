import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch, apiDelete, apiPost } from "@/lib/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/ui/icons";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, Mail, Shield, Trash2, AlertTriangle, Mic, Volume2, Info, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [settings, setSettings] = useState({
    preferredLanguage: "en",
    emailVerified: false,
    email: "",
    username: "",
  });
  
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiGet("/api/settings");
      
      if (!response.ok) {
        throw new Error("Failed to load settings");
      }
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await apiPatch("/api/settings", {
        preferredLanguage: settings.preferredLanguage,
      });
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await apiPost("/api/auth/resend-verification");

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox for the verification link.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to resend verification email.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend verification email. Please try again later.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your password to confirm account deletion.",
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          password: deletePassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete account");
      }
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // Logout and redirect to home
      setTimeout(() => {
        logout();
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and settings
          </p>
        </motion.div>

        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details and verification status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Username</Label>
                  <div className="flex items-center gap-2">
                    <Input value={settings.username} disabled className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={settings.email} disabled className="bg-muted" />
                    {settings.emailVerified ? (
                      <Badge className="bg-green-500 whitespace-nowrap">
                        <Icons.check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {!settings.emailVerified && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-400">Email Not Verified</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Please verify your email address to access all features.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        className="mt-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Language Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language Preferences
              </CardTitle>
              <CardDescription>Choose your preferred language for the application</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage">Preferred Language</Label>
                  <select
                    id="preferredLanguage"
                    value={settings.preferredLanguage}
                    onChange={(e) => setSettings({ ...settings, preferredLanguage: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="zh">Chinese (中文)</option>
                    <option value="ja">Japanese (日本語)</option>
                    <option value="ko">Korean (한국어)</option>
                    <option value="pt">Portuguese (Português)</option>
                    <option value="it">Italian (Italiano)</option>
                    <option value="ru">Russian (Русский)</option>
                  </select>
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.check className="mr-2 h-4 w-4" />
                      Save Language Preference
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>



        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. All your data, including documents, flashcards, 
                    quizzes, and progress will be permanently deleted.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full sm:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                          <p>
                            This action cannot be undone. This will permanently delete your account and remove all your data 
                            from our servers.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                            <div className="relative">
                              <Input
                                id="deletePassword"
                                type={showDeletePassword ? 'text' : 'password'}
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Enter your password"
                                className="border-red-300 focus:border-red-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowDeletePassword(!showDeletePassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                              >
                                {showDeletePassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletePassword("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || !deletePassword}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? (
                            <>
                              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Account
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
