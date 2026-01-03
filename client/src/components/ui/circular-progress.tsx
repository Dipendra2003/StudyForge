import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CircularProgressProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  valueClassName?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  children?: React.ReactNode;
  animate?: boolean;
  animationDuration?: number;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      value,
      size = 120,
      strokeWidth = 8,
      className,
      showValue = true,
      valueClassName,
      trackClassName,
      indicatorClassName,
      children,
      animate = true,
      animationDuration = 1.5,
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    const center = size / 2;

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className={cn("text-muted opacity-20", trackClassName)}
          />
          
          {/* Progress indicator */}
          {animate ? (
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className={cn("text-primary transition-colors", indicatorClassName)}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${(value / 100) * circumference} ${circumference}`,
              }}
              transition={{
                duration: animationDuration,
                ease: "easeOut",
              }}
            />
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
              className={cn("text-primary transition-all duration-300", indicatorClassName)}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children ? (
            children
          ) : showValue ? (
            <motion.div
              initial={animate ? { opacity: 0, scale: 0 } : false}
              animate={animate ? { opacity: 1, scale: 1 } : false}
              transition={
                animate
                  ? { delay: animationDuration * 0.5, type: "spring" }
                  : undefined
              }
              className="text-center"
            >
              <div className={cn("text-2xl font-bold", valueClassName)}>
                {Math.round(value)}%
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
