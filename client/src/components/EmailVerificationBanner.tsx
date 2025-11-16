import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface EmailVerificationBannerProps {
  /**
   * Whether to show the banner
   */
  show: boolean;
}

export function EmailVerificationBanner({ show }: EmailVerificationBannerProps) {
  const { toast } = useToast();
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  if (!show) {
    return null;
  }

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 shadow-md">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-400 font-semibold">
          Email Not Verified
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <span className="text-sm">
              Please verify your email address to access all features. Check your inbox for the verification link.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/30 whitespace-nowrap shadow-sm"
            >
              {isResendingVerification ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Email
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
