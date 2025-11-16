import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, XCircle, Loader2, AlertCircle, Link2, KeyRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OTPInput } from "@/components/OTPInput";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "otp">("link");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Extract token from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      // If token is present in URL, automatically verify with link
      setVerificationStatus("loading");
      verifyEmail(token);
    } else {
      // No token in URL, show manual OTP entry option
      setVerificationStatus("idle");
      setActiveTab("otp");
    }
  }, [token]);

  useEffect(() => {
    // Auto-redirect to login after successful verification
    if (verificationStatus === "success") {
      // Set flag to show success message on login page
      sessionStorage.setItem("emailJustVerified", "true");
      
      const timer = setTimeout(() => {
        navigate("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [verificationStatus, navigate]);

  async function verifyEmail(verificationToken: string) {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for specific error types
        if (data.expired) {
          setIsExpired(true);
          setErrorMessage("Your verification link has expired. Verification links are valid for 24 hours.");
        } else if (data.alreadyVerified) {
          setIsAlreadyVerified(true);
          setErrorMessage("Your email is already verified. You can log in to your account.");
        } else {
          setErrorMessage(data.message || "Email verification failed. The link may be invalid or already used.");
        }
        setVerificationStatus("error");
        
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: data.message || "Please try again or request a new verification link.",
        });
        return;
      }

      // Check if already verified in success response
      if (data.alreadyVerified) {
        setIsAlreadyVerified(true);
        setVerificationStatus("success");
        toast({
          title: "Already verified",
          description: "Your email was already verified.",
        });
        return;
      }

      setVerificationStatus("success");
      toast({
        title: "Email verified!",
        description: "Your email has been successfully verified. Redirecting to login...",
      });
    } catch (error) {
      setVerificationStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "An unexpected error occurred. Please try again or request a new verification link.",
      });
    }
  }

  async function verifyWithOTP(otp: string) {
    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for specific error types
        if (data.expired) {
          setIsExpired(true);
          setErrorMessage("Your verification code has expired. Verification codes are valid for 24 hours.");
        } else if (data.alreadyVerified) {
          setIsAlreadyVerified(true);
          setErrorMessage("Your email is already verified. You can log in to your account.");
        } else {
          setErrorMessage(data.message || "Email verification failed. The code may be invalid or already used.");
        }
        setVerificationStatus("error");
        
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: data.message || "Please check your code and try again.",
        });
        return;
      }

      // Check if already verified in success response
      if (data.alreadyVerified) {
        setIsAlreadyVerified(true);
        setVerificationStatus("success");
        toast({
          title: "Already verified",
          description: "Your email was already verified.",
        });
        return;
      }

      setVerificationStatus("success");
      toast({
        title: "Email verified!",
        description: "Your email has been successfully verified. Redirecting to login...",
      });
    } catch (error) {
      setVerificationStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "An unexpected error occurred. Please check your code and try again.",
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  function handleOTPComplete(otp: string) {
    verifyWithOTP(otp);
  }

  function handleOTPChange(_otp: string) {
    // Reset error state when user starts typing
    if (verificationStatus === "error") {
      setVerificationStatus("idle");
      setErrorMessage("");
      setIsExpired(false);
    }
  }

  async function resendVerificationEmail() {
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend verification email");
      }

      toast({
        title: "Email sent!",
        description: "A new verification email has been sent to your inbox. Please check your email.",
      });

      // Reset error state
      setIsExpired(false);
      setErrorMessage("A new verification email has been sent. Please check your inbox and spam folder.");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to resend email",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsResending(false);
    }
  }

  // Show idle state with OTP input option
  if (verificationStatus === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                You need to verify your email before you can log in. Check your inbox for the verification code.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <OTPInput
                length={6}
                onComplete={handleOTPComplete}
                onChange={handleOTPChange}
                disabled={isVerifyingOtp}
                autoSubmit={true}
              />
              {isVerifyingOtp && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying code...</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="mb-2">
                Check your email inbox for a message from Jadoo with your verification code.
              </p>
              <p className="text-xs">
                The code is valid for 24 hours.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={resendVerificationEmail}
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {isResending ? "Sending..." : "Resend Verification Code"}
            </Button>
            <Button
              variant="ghost"
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

  if (verificationStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Your Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isAlreadyVerified ? "Already Verified!" : "Email Verified!"}
            </CardTitle>
            <CardDescription>
              {isAlreadyVerified 
                ? "Your email address was already verified."
                : "Your email address has been successfully verified."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground text-center">
              <p className="mb-2">You can now access all features of your Jadoo account.</p>
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

  // Error state - show tabs to allow switching between link and OTP verification
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isExpired ? "Verification Code Expired" : "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {errorMessage || "We couldn't verify your email address."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExpired && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Verification codes expire after 24 hours for security reasons. Please request a new verification email or try entering your code manually.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "link" | "otp")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Link
              </TabsTrigger>
              <TabsTrigger value="otp" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                {isExpired ? (
                  <>
                    <p className="mb-2">
                      For your security, verification links are only valid for 24 hours.
                    </p>
                    <p>
                      Click the button below to receive a new verification email with a fresh link.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">
                      The verification link may be invalid, already used, or malformed.
                    </p>
                    <p>
                      Please request a new verification email or try entering your code manually.
                    </p>
                  </>
                )}
              </div>
              <Button
                className="w-full"
                onClick={resendVerificationEmail}
                disabled={isResending}
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Button>
            </TabsContent>
            
            <TabsContent value="otp" className="space-y-4">
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground text-center">
                  <p>Enter the 6-digit code from your email</p>
                </div>
                <OTPInput
                  length={6}
                  onComplete={handleOTPComplete}
                  onChange={handleOTPChange}
                  disabled={isVerifyingOtp}
                  autoSubmit={true}
                />
                {isVerifyingOtp && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying code...</span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
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
