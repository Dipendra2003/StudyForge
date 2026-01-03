import { motion } from "framer-motion";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Trophy, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface CircularScoreTrackerProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showIcon?: boolean;
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  animationDuration?: number;
  className?: string;
}

export function CircularScoreTracker({
  score,
  size = 120,
  strokeWidth = 10,
  showIcon = true,
  showLabel = true,
  label = "Score",
  animate = true,
  animationDuration = 1.5,
  className,
}: CircularScoreTrackerProps) {
  // Determine color based on score
  const getScoreColor = () => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    return "text-orange-500";
  };

  // Get appropriate icon based on score
  const getScoreIcon = () => {
    if (score >= 90) return Trophy;
    if (score >= 70) return TrendingUp;
    return Target;
  };

  const Icon = getScoreIcon();
  const colorClass = getScoreColor();

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <CircularProgress
        value={score}
        size={size}
        strokeWidth={strokeWidth}
        animate={animate}
        animationDuration={animationDuration}
        indicatorClassName={colorClass}
      >
        <motion.div
          initial={animate ? { opacity: 0, scale: 0 } : false}
          animate={animate ? { opacity: 1, scale: 1 } : false}
          transition={
            animate
              ? { delay: animationDuration * 0.5, type: "spring" }
              : undefined
          }
          className="flex flex-col items-center justify-center"
        >
          {showIcon && (
            <Icon className={cn("h-6 w-6 mb-1", colorClass)} />
          )}
          <div className="text-3xl font-bold">{Math.round(score)}%</div>
        </motion.div>
      </CircularProgress>
      {showLabel && (
        <motion.p
          initial={animate ? { opacity: 0, y: 10 } : false}
          animate={animate ? { opacity: 1, y: 0 } : false}
          transition={
            animate
              ? { delay: animationDuration * 0.7 }
              : undefined
          }
          className="text-sm text-muted-foreground font-medium"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
