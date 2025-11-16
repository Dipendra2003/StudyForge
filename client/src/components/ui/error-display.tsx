import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getErrorDetails, isRetryableError } from '@/lib/errorHandler';
import { motion } from 'framer-motion';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, onGoHome, className }: ErrorDisplayProps) {
  const errorDetails = getErrorDetails(error);
  const canRetry = isRetryableError(error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Alert variant="destructive" className="border-2">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">
          {errorDetails.title}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">{errorDetails.message}</p>
          {errorDetails.suggestion && (
            <p className="text-sm font-medium">{errorDetails.suggestion}</p>
          )}
          
          <div className="flex gap-2 pt-2">
            {canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            {onGoHome && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGoHome}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

interface InlineErrorProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function InlineError({ error, onRetry, compact = false }: InlineErrorProps) {
  const errorDetails = getErrorDetails(error);
  const canRetry = isRetryableError(error);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{errorDetails.message}</span>
        {canRetry && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-destructive">
            {errorDetails.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {errorDetails.message}
          </p>
          {errorDetails.suggestion && (
            <p className="text-xs text-muted-foreground italic">
              {errorDetails.suggestion}
            </p>
          )}
        </div>
        {canRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-1 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
