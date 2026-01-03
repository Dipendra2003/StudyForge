import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MotivationalFeedbackProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'support' | 'periodic';
}

export function MotivationalFeedback({ message, visible, type = 'success' }: MotivationalFeedbackProps) {
  if (!message || !visible) return null;

  const bgColor = type === 'success' 
    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
    : type === 'support'
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
    : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';

  const textColor = type === 'success'
    ? 'text-green-900 dark:text-green-100'
    : type === 'support'
    ? 'text-amber-900 dark:text-amber-100'
    : 'text-blue-900 dark:text-blue-100';

  const iconColor = type === 'success'
    ? 'text-green-600 dark:text-green-400'
    : type === 'support'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ 
            duration: 0.4,
            ease: "easeOut"
          }}
          className="mt-4"
        >
          <Alert className={`${bgColor} shadow-lg`}>
            <motion.div
              initial={{ rotate: 0, scale: 1 }}
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Sparkles className={`h-4 w-4 ${iconColor}`} />
            </motion.div>
            <AlertDescription className={textColor}>
              <strong className="font-semibold">Jadoo says:</strong> {message}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
