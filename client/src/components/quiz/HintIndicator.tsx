import { Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface HintIndicatorProps {
  hintsUsed: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function HintIndicator({ hintsUsed, size = 'md', showCount = true }: HintIndicatorProps) {
  if (hintsUsed === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <Lightbulb className={sizeClasses[size]} />
            {showCount && (
              <span className={`font-medium ${textSizeClasses[size]}`}>
                {hintsUsed}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hintsUsed} hint{hintsUsed !== 1 ? 's' : ''} used</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
