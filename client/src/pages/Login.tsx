import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast, showSuccessToast } from "@/lib/errorHandler";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Mail } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Check if user just verified their email and restore username
  useEffect(() => {
    const pendingUsername = sessionStorage.getItem("pendingLoginUsername");
    const justVerified = sessionStorage.getItem("emailJustVerified");
    
    if (pendingUsername) {
      form.setValue("username", pendingUsername);
      sessionStorage.removeItem("pendingLoginUsername");
    }
    
    if (justVerified === "true") {
      toast({
        title: "Email Verified!",
        description: "You can now log in to your account.",
      });
      sessionStorage.removeItem("emailJustVerified");
    }
  }, [form, toast]);

  // Handle resend verification email
  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

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
          description: data.message || "Failed to resend verification email. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend verification email. Please try again later.",
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  async function onSubmit(data: LoginFormValues) {
    // Prevent multiple submissions
    if (isLoading || isSubmittingRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      const result = await response.json();

      // Handle error responses
      if (!response.ok) {
        // Handle errors (no longer blocking unverified emails)
        showErrorToast(result.message || "Login failed", { title: "Login Failed" });
        return;
      }

      // Success - update auth state and wait for it to complete
      await login(result.user);
      
      // Check if email is not verified and show warning banner
      if (result.user && !result.user.emailVerified) {
        setShowEmailWarning(true);
        showSuccessToast("Welcome back! Please verify your email to access all features.", { title: "Login successful!" });
      } else {
        showSuccessToast("Welcome back to Jadoo Study Assistant.", { title: "Login successful!" });
      }
      
      // Navigate after state is updated
      navigate("/dashboard");
      
    } catch (error: any) {
      showErrorToast(error?.message || "Network error. Please try again.", { title: "Login Failed" });
      // Only reset on error
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Log in to your Jadoo Study Assistant account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Verification Warning Banner */}
          {showEmailWarning && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-400 font-semibold">Email Not Verified</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <div className="flex flex-col gap-3 mt-2">
                  <span className="text-sm">
                    Please verify your email address to access all features. Check your inbox for the verification link.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/30 w-full sm:w-auto"
                  >
                    {isResendingVerification ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isLoading}>
            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                placeholder="Enter your username or email"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="p-0 text-sm"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={form.watch("rememberMe")}
                onCheckedChange={(checked) => {
                  form.setValue("rememberMe", checked as boolean);
                }}
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              onClick={(e) => {
                // Prevent any double-click issues
                if (isLoading || isSubmittingRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Log in
            </Button>
            </fieldset>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0"
              onClick={() => navigate("/register")}
            >
              Sign up
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}