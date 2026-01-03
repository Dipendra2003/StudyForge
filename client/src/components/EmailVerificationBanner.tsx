import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationBannerProps {
  show: boolean;
}

export function EmailVerificationBanner({ show }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  if (!show || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'No email address found',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification email');
      }

      toast({
        title: 'Verification email sent!',
        description: 'Please check your email for the verification link.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resend',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong className="font-semibold">Verify your email address</strong>
              <p className="mt-1 text-sm">
                Please check your email and click the verification link to access all features.
                Didn't receive it?
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
                className="h-auto p-0 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend verification email'
                )}
              </Button>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-300"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}
