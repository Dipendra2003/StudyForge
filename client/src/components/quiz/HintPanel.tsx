import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HintPanelProps {
  questionId: number;
  sessionId?: string;
  onHintUsed?: (hint: string, attemptNumber: number) => void;
  disabled?: boolean;
}

export function HintPanel({ questionId, sessionId, onHintUsed, disabled }: HintPanelProps) {
  const [hints, setHints] = useState<Array<{ text: string; attemptNumber: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const { toast } = useToast();

  const requestHint = async () => {
    if (disabled) {
      toast({
        title: "Hints disabled",
        description: "You cannot request hints at this time.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/quiz/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          attemptNumber,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate hint');
      }

      const data = await response.json();
      const newHint = { text: data.hint, attemptNumber: data.attemptNumber };
      
      setHints([...hints, newHint]);
      setAttemptNumber(attemptNumber + 1);

      if (onHintUsed) {
        onHintUsed(data.hint, data.attemptNumber);
      }

      toast({
        title: "Hint received!",
        description: `This is hint #${data.attemptNumber}`,
      });
    } catch (error) {
      console.error('Error requesting hint:', error);
      toast({
        title: "Error",
        description: "Failed to generate hint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHintLevel = (attempt: number) => {
    if (attempt === 1) return 'Subtle';
    if (attempt === 2) return 'Moderate';
    return 'Specific';
  };

  return (
    <Card className="w-full glass-light">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          AI Hints
        </CardTitle>
        <CardDescription>
          Need help? Request a hint from the AI assistant. Hints become more specific with each request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hints.length > 0 && (
          <div className="space-y-3">
            {hints.map((hint, index) => (
              <div
                key={index}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                    Hint #{hint.attemptNumber} ({getHintLevel(hint.attemptNumber)})
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{hint.text}</p>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={requestHint}
          disabled={isLoading || disabled}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating hint...
            </>
          ) : (
            <>
              <Lightbulb className="mr-2 h-4 w-4" />
              Request {hints.length > 0 ? 'Another' : 'a'} Hint
            </>
          )}
        </Button>

        {hints.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {hints.length} hint{hints.length !== 1 ? 's' : ''} used for this question
          </p>
        )}
      </CardContent>
    </Card>
  );
}
