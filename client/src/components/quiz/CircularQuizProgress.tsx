import { motion } from "framer-motion";
import { CircularProgress } from "@/components/ui/circular-progress";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CircularQuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  size?: number;
  strokeWidth?: number;
  showQuestionNumbers?: boolean;
  animate?: boolean;
  animationDuration?: number;
  className?: string;
}

export function CircularQuizProgress({
  currentQuestion,
  totalQuestions,
  size = 80,
  strokeWidth = 6,
  showQuestionNumbers = true,
  animate = true,
  animationDuration = 0.5,
  className,
}: CircularQuizProgressProps) {
  const progress = (currentQuestion / totalQuestions) * 100;
  const isComplete = currentQuestion === totalQuestions;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <CircularProgress
        value={progress}
        size={size}
        strokeWidth={strokeWidth}
        animate={animate}
        animationDuration={animationDuration}
        indicatorClassName={isComplete ? "text-green-500" : "text-primary"}
      >
        <motion.div
          key={currentQuestion}
          initial={animate ? { opacity: 0, scale: 0.8 } : false}
          animate={animate ? { opacity: 1, scale: 1 } : false}
          transition={
            animate
              ? { type: "spring", stiffness: 300, damping: 20 }
              : undefined
          }
          className="flex flex-col items-center justify-center"
        >
          {isComplete ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <>
              {showQuestionNumbers ? (
                <div className="text-center">
                  <div className="text-lg font-bold">{currentQuestion}</div>
                  <div className="text-xs text-muted-foreground">/{totalQuestions}</div>
                </div>
              ) : (
                <Circle className="h-6 w-6 text-primary" />
              )}
            </>
          )}
        </motion.div>
      </CircularProgress>
    </div>
  );
}
