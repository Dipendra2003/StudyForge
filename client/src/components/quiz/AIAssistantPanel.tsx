import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Lightbulb, Sparkles, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

export interface AIAssistantPanelProps {
  visible: boolean;
  message: string;
  type: 'hint' | 'motivation' | 'explanation';
  onClose: () => void;
  onRequestHint?: () => Promise<void>;
  isLoadingHint?: boolean;
  canRequestHint?: boolean;
  expandable?: boolean;
  expandedContent?: string;
  onRequestExpanded?: () => Promise<void>;
  isLoadingExpanded?: boolean;
}

export function AIAssistantPanel({
  visible,
  message,
  type,
  onClose,
  onRequestHint,
  isLoadingHint = false,
  canRequestHint = false,
  expandable = false,
  expandedContent,
  onRequestExpanded,
  isLoadingExpanded = false,
}: AIAssistantPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandToggle = async () => {
    if (!isExpanded && !expandedContent && onRequestExpanded) {
      await onRequestExpanded();
    }
    setIsExpanded(!isExpanded);
  };

  // Get styling based on message type
  const getTypeStyles = () => {
    switch (type) {
      case 'hint':
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          textColor: 'text-yellow-900 dark:text-yellow-100',
          icon: Lightbulb,
          title: 'AI Hint',
        };
      case 'motivation':
        return {
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          iconColor: 'text-purple-600 dark:text-purple-400',
          textColor: 'text-purple-900 dark:text-purple-100',
          icon: Sparkles,
          title: 'Motivation',
        };
      case 'explanation':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          textColor: 'text-blue-900 dark:text-blue-100',
          icon: Lightbulb,
          title: 'Explanation',
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  if (!visible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ 
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        <Card className={`w-full glass-light ${styles.bgColor} ${styles.borderColor} border-2 shadow-lg`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ 
                    rotate: type === 'hint' ? [0, -10, 10, -10, 0] : 0,
                    scale: type === 'motivation' ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ 
                    duration: 0.5,
                    repeat: type === 'motivation' ? Infinity : 0,
                    repeatDelay: 2,
                  }}
                >
                  <Icon className={`h-5 w-5 ${styles.iconColor}`} />
                </motion.div>
                <CardTitle className={`text-lg ${styles.textColor}`}>
                  {styles.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`h-6 w-6 p-0 ${styles.iconColor} hover:bg-transparent`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Main Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Alert className={`${styles.bgColor} ${styles.borderColor} border`}>
                <AlertDescription className={`${styles.textColor} text-sm leading-relaxed`}>
                  {message}
                </AlertDescription>
              </Alert>
            </motion.div>

            {/* Expandable Content */}
            {expandable && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandToggle}
                  disabled={isLoadingExpanded}
                  className="w-full"
                >
                  {isLoadingExpanded ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading detailed explanation...
                    </>
                  ) : (
                    <>
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Show More Details
                        </>
                      )}
                    </>
                  )}
                </Button>

                <AnimatePresence>
                  {isExpanded && expandedContent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3"
                    >
                      <Alert className={`${styles.bgColor} ${styles.borderColor} border`}>
                        <AlertDescription className={`${styles.textColor} text-sm leading-relaxed`}>
                          {expandedContent}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Hint Request Button (only for hint type) */}
            {type === 'hint' && canRequestHint && onRequestHint && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <Button
                  onClick={onRequestHint}
                  disabled={isLoadingHint}
                  variant="default"
                  className="w-full"
                >
                  {isLoadingHint ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating hint...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Request Another Hint
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
