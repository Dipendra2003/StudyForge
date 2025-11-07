import { motion } from "framer-motion";
import { CheckCircle2, Circle, Star, Trophy, BookOpen, Code, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export type SignupStep = 
  | "basic-info" 
  | "profile" 
  | "preferences" 
  | "complete";

interface SignupProgressProps {
  currentStep: SignupStep;
  totalSteps: number;
  completedSteps: number;
}

const steps: { id: SignupStep; label: string; icon: React.ReactNode }[] = [
  { 
    id: "basic-info", 
    label: "Account Setup", 
    icon: <Circle className="h-5 w-5" /> 
  },
  { 
    id: "profile", 
    label: "Your Profile", 
    icon: <BookOpen className="h-5 w-5" /> 
  },
  { 
    id: "preferences", 
    label: "Learning Style", 
    icon: <Brain className="h-5 w-5" /> 
  },
  { 
    id: "complete", 
    label: "Ready to Go!", 
    icon: <Trophy className="h-5 w-5" /> 
  },
];

export function SignupProgress({ 
  currentStep, 
  totalSteps, 
  completedSteps 
}: SignupProgressProps) {
  const percentage = (completedSteps / totalSteps) * 100;
  
  return (
    <div className="space-y-4 mb-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = getStepIndex(step.id) < getStepIndex(currentStep);
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "flex flex-col items-center space-y-2 relative",
                isActive && "text-primary font-medium",
                isCompleted && "text-primary font-medium",
                !isActive && !isCompleted && "text-gray-400"
              )}
            >
              {/* Step icon with completion indicator */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: isActive ? 1.1 : 1, 
                  opacity: 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "rounded-full p-2 bg-muted",
                  isActive && "bg-primary/10 text-primary",
                  isCompleted && "bg-primary/20 text-primary"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  step.icon
                )}
                
                {/* Special animation for active step */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/10"
                    initial={{ scale: 0.85, opacity: 0.5 }}
                    animate={{ 
                      scale: [0.85, 1.1, 0.85], 
                      opacity: [0.5, 0.3, 0.5] 
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.div>
              
              {/* Step label */}
              <span className="text-xs sm:text-sm whitespace-nowrap">{step.label}</span>
            </div>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 bottom-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      
      {/* Achievements */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="h-4 w-4 text-amber-500" fill="currentColor" />
          <span>{completedSteps} / {totalSteps} steps completed</span>
        </div>
        
        {/* Completion percentage */}
        <div className="text-sm font-medium">
          {Math.round(percentage)}% Complete
        </div>
      </div>
    </div>
  );
}

// Helper function to get step index from ID
function getStepIndex(stepId: SignupStep): number {
  return steps.findIndex(step => step.id === stepId);
}

// Achievement badge component
interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

export function AchievementBadge({ 
  title, 
  description, 
  icon, 
  unlocked 
}: AchievementBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex items-center p-3 rounded-lg border",
        unlocked 
          ? "bg-primary/5 border-primary/20" 
          : "bg-muted/50 border-muted text-muted-foreground"
      )}
    >
      <div className={cn(
        "flex items-center justify-center h-10 w-10 rounded-full mr-3",
        unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {unlocked && (
        <div className="ml-auto">
          <Trophy className="h-5 w-5 text-amber-500" />
        </div>
      )}
    </motion.div>
  );
}

// Achievement popup for newly unlocked badges
interface AchievementPopupProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClose: () => void;
}

export function AchievementPopup({
  title,
  description,
  icon,
  onClose
}: AchievementPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="fixed bottom-4 right-4 bg-card border shadow-lg rounded-lg p-4 max-w-sm z-50"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full mr-4">
          {icon}
        </div>
        <div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-amber-500 mr-1" fill="currentColor" />
            <h4 className="text-sm font-bold">Achievement Unlocked!</h4>
          </div>
          <h3 className="font-medium mt-1">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <button
            onClick={onClose}
            className="text-xs text-primary font-medium mt-2"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}