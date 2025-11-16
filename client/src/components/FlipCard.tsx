import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFlashcardText } from "@/lib/formatText";

interface FlipCardProps {
  question: string;
  answer: string;
  questionImage?: string | null;
  answerImage?: string | null;
  category?: string;
  isFlipped: boolean;
  onFlip: () => void;
  className?: string;
}

export function FlipCard({
  question,
  answer,
  questionImage,
  answerImage,
  category,
  isFlipped,
  onFlip,
  className,
}: FlipCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Handle flip with animation lock
  const handleFlip = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    onFlip();
    
    // Lock for animation duration (600ms)
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div
      className={cn(
        "relative w-full h-[400px]",
        prefersReducedMotion ? "" : "perspective-1000",
        className
      )}
      style={
        prefersReducedMotion
          ? undefined
          : {
              perspective: "1000px",
            }
      }
      role="region"
      aria-label="Flashcard"
      aria-live="polite"
    >
      <div
        className={cn(
          "relative w-full h-full transition-all duration-600 cursor-pointer",
          prefersReducedMotion
            ? isFlipped
              ? "opacity-100"
              : "opacity-100"
            : "transform-style-3d",
          !prefersReducedMotion && isFlipped && "rotate-y-180"
        )}
        style={
          prefersReducedMotion
            ? undefined
            : {
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)",
              }
        }
        onClick={!isFlipped ? handleFlip : undefined}
        role="button"
        tabIndex={!isFlipped ? 0 : -1}
        onKeyDown={(e) => {
          if (!isFlipped && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleFlip();
          }
        }}
        aria-label={isFlipped ? "Flashcard showing answer" : "Flashcard showing question, press Enter or Space to reveal answer"}
      >
        {/* Front Face (Question) */}
        <Card
          className={cn(
            "absolute inset-0 w-full h-full border-2 hover:shadow-lg transition-shadow",
            prefersReducedMotion
              ? isFlipped
                ? "hidden"
                : "block"
              : "backface-hidden"
          )}
          style={
            prefersReducedMotion
              ? undefined
              : {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }
          }
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center w-full space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              
              {questionImage && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={questionImage}
                    alt={`Visual aid for question: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`}
                    className="max-w-full max-h-48 rounded-lg object-contain"
                  />
                </div>
              )}
              
              <p className="text-xl font-medium leading-relaxed whitespace-pre-line">
                {formatFlashcardText(question)}
              </p>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlip();
                }}
                className="mt-8"
                disabled={isAnimating}
                aria-label="Reveal answer to flashcard question"
              >
                Show Answer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back Face (Answer) */}
        <Card
          className={cn(
            "absolute inset-0 w-full h-full border-2",
            prefersReducedMotion
              ? isFlipped
                ? "block animate-in fade-in duration-300"
                : "hidden"
              : "backface-hidden rotate-y-180"
          )}
          style={
            prefersReducedMotion
              ? undefined
              : {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }
          }
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8 overflow-y-auto">
            <div className="text-center w-full space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="w-full">
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Question</p>
                  <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                    {formatFlashcardText(question)}
                  </p>
                </div>
              </div>
              
              <div className="w-full p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-sm">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" />
                  Answer
                </p>
                
                {answerImage && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={answerImage}
                      alt={`Visual aid for answer: ${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}`}
                      className="max-w-full max-h-48 rounded-lg object-contain border-2 border-green-200 dark:border-green-800"
                    />
                  </div>
                )}
                
                <div className="text-base font-medium leading-relaxed text-gray-800 dark:text-gray-200 space-y-3">
                  {formatFlashcardText(answer).split('. ').filter(s => s.trim()).map((sentence, idx) => (
                    <p key={idx} className="text-left">
                      {sentence.trim()}{sentence.trim().endsWith('.') ? '' : '.'}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
