import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

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
import { Alert, AlertDescription } from "@/components/ui/alert";

const resetPasswordSchema = z.object({
  otp: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Extract token from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const urlOtp = searchParams.get("otp");
  
  // Determine if we're using token from URL or manual OTP entry
  const hasToken = !!token;
  const hasUrlOtp = !!urlOtp;
  const [manualOtpMode, setManualOtpMode] = useState(!hasToken && !hasUrlOtp);
  const resetMethod = hasToken ? "token" : hasUrlOtp ? "otp" : manualOtpMode ? "manual-otp" : null;

  useEffect(() => {
    // Auto-redirect to login after successful password reset
    if (resetSuccess) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resetSuccess, navigate]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: urlOtp || "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    // Determine which credential to use: token from URL, OTP from URL, or manual OTP
    const otpToUse = data.otp || urlOtp;
    
    if (!token && !otpToUse) {
      toast({
        variant: "destructive",
        title: "Invalid reset credentials",
        description: "Please enter your 6-digit verification code.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(token && { token }),
          ...(otpToUse && { otp: otpToUse }),
          password: data.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check for specific error types
        if (responseData.expired) {
          setIsExpired(true);
          setErrorMessage(
            resetMethod === "otp"
              ? "Your password reset code has expired. Reset codes are valid for 1 hour."
              : "Your password reset link has expired. Reset links are valid for 1 hour."
          );
        } else {
          setErrorMessage(
            responseData.message ||
            (resetMethod === "otp"
              ? "Failed to reset password. The code may be invalid or already used."
              : "Failed to reset password. The link may be invalid or already used.")
          );
        }
        
        toast({
          variant: "destructive",
          title: "Failed to reset password",
          description: responseData.message || "Please try again or request a new reset code.",
        });
        return;
      }

      setResetSuccess(true);
      toast({
        title: "Password reset successful!",
        description: "You can now log in with your new password. Redirecting to login...",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: "An unexpected error occurred. Please try again or request a new reset code.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Allow manual OTP entry if no token or URL OTP is provided
  // This section is removed to allow manual OTP entry

  if (resetSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground text-center">
              <p className="mb-2">You can now log in to your account with your new password.</p>
              <p className="text-xs">Redirecting to login in 3 seconds...</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => navigate("/login")}
            >
              Continue to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            {hasToken 
              ? "Enter your new password below."
              : hasUrlOtp
              ? "Enter your new password below. You're using a verification code."
              : "Enter your 6-digit verification code and new password below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {hasToken
                  ? "Your password reset link has expired. Reset links are valid for 1 hour. Please request a new one."
                  : "Your password reset code has expired. Reset codes are valid for 1 hour. Please request a new one."}
              </AlertDescription>
            </Alert>
          )}
          {errorMessage && !isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {manualOtpMode && (
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={isExpired}
                  {...form.register("otp")}
                />
                {form.formState.errors.otp && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.otp.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your password reset email
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="Enter new password"
                  disabled={isExpired}
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  className="pl-9"
                  placeholder="Confirm new password"
                  disabled={isExpired}
                  {...form.register("confirmPassword")}
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isExpired}
            >
              {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset Password
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {isExpired && (
            <Button
              className="w-full"
              onClick={() => navigate("/forgot-password")}
            >
              Request New Reset Code
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
