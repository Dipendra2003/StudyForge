import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ListChecks,
  Clock,
  Mic,
  AlertCircle,
  Settings2,
  Maximize,
} from "lucide-react";
import { QuestionType } from "@/../../shared/quiz-types";
import { SaveQuizButton } from "./SaveQuizButton";
import { FavoriteQuizButton } from "./FavoriteQuizButton";

export interface QuizConfig {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  timedMode: boolean;
  timeLimit?: number; // seconds
  questionTypes: QuestionType[];
  sessionId?: string; // Optional session ID for tracking hints and progress
  topic?: string; // Optional specific topic for AI generation
  aiMode?: boolean; // Whether to use AI generation instead of database questions
  fullscreenMode?: boolean; // Whether to enter fullscreen during quiz
}

interface QuizConfigurationPanelProps {
  onStartQuiz: (config: QuizConfig) => void;
  availableCategories?: string[];
  availableDifficulties?: string[];
  isLoading?: boolean;
  disabled?: boolean;
}

const DEFAULT_CATEGORIES = ['Tech', 'Science', 'General Knowledge', 'Coding', 'Math', 'History', 'Literature'];
const DEFAULT_DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'rearrange', label: 'Rearrange' },
];

export default function QuizConfigurationPanel({
  onStartQuiz,
  availableCategories = DEFAULT_CATEGORIES,
  availableDifficulties = DEFAULT_DIFFICULTIES,
  isLoading = false,
  disabled = false,
}: QuizConfigurationPanelProps) {
  const [config, setConfig] = useState<QuizConfig>({
    category: availableCategories[0] || 'General Knowledge', // Default to valid category
    difficulty: 'medium', // Default to medium
    questionCount: 10,
    timedMode: false,
    timeLimit: 300, // 5 minutes default
    questionTypes: ['mcq'],
    topic: '',
    aiMode: true,
  });

  const [errors, setErrors] = useState<string[]>([]);

  // Fetch available question count based on filters
  // Skip database query when AI mode is enabled (Req 28.4)
  const { data: availableCount, isLoading: isCountLoading } = useQuery({
    queryKey: ['/api/questions/count', config.category, config.difficulty, config.questionTypes],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: config.category.toLowerCase(),
        difficulty: config.difficulty,
        types: config.questionTypes.join(','),
      });
      const response = await apiRequest<{ count: number }>(`/api/questions/count?${params}`);
      return response.count || 0;
    },
    enabled: !disabled && !config.aiMode, // Don't query database when AI mode is active
  });

  // Validate configuration
  useEffect(() => {
    const newErrors: string[] = [];

    // Validate question count is between 1 and 50 (Req 28.2)
    if (!config.questionCount || config.questionCount < 1) {
      newErrors.push("Question count must be at least 1");
    } else if (config.questionCount > 50) {
      newErrors.push("Question count cannot exceed 50");
    }

    // Ensure at least 1 question type is selected (Req 28.2)
    if (config.questionTypes.length === 0) {
      newErrors.push("Please select at least one question type");
    }

    if (config.timedMode && (!config.timeLimit || config.timeLimit < 30)) {
      newErrors.push("Time limit must be at least 30 seconds");
    }

    // Ensure either a category is selected or a topic is provided
    if (!config.category && (!config.topic || config.topic.trim() === '')) {
      newErrors.push("Please select a category or enter a custom topic");
    }

    if (config.aiMode) {
      if (!config.difficulty) {
        newErrors.push("Difficulty is required for AI question generation");
      }
    } else {
      // Only validate against database count when AI mode is disabled (Req 28.4)
      if (!isCountLoading && availableCount !== undefined && config.questionCount > availableCount && availableCount > 0) {
        newErrors.push(`Only ${availableCount} questions available for selected filters`);
      }
      // Show error if no questions available in database mode
      if (!isCountLoading && availableCount !== undefined && availableCount === 0) {
        newErrors.push("No questions match your selected criteria. Please try different settings or enable AI mode.");
      }
    }

    setErrors(newErrors);
  }, [config, availableCount, isCountLoading]);

  const handleStartQuiz = () => {
    if (config.aiMode) {
      if (errors.length === 0) {
        onStartQuiz(config);
      }
    } else {
      if (errors.length === 0 && !isCountLoading && availableCount && availableCount > 0) {
        onStartQuiz(config);
      }
    }
  };

  const updateConfig = <K extends keyof QuizConfig>(key: K, value: QuizConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setConfig(prev => {
      // Don't allow unchecking the last remaining selected question type
      if (prev.questionTypes.includes(type) && prev.questionTypes.length === 1) {
        return prev;
      }
      const types = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type];
      return { ...prev, questionTypes: types };
    });
  };

  // When AI mode is enabled, don't require database questions (Req 28.4)
  const canStartQuiz = errors.length === 0 && !disabled && !!(config.category || config.topic) && (config.aiMode || (availableCount && availableCount > 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="glass-card">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Quiz Configuration
              </CardTitle>
              <CardDescription>
                Configure your quiz parameters before starting
              </CardDescription>
            </div>
            {isCountLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="space-y-2"
          >
          <Label htmlFor="category">Category</Label>
          <Select
            value={config.category}
            onValueChange={(value) => updateConfig('category', value)}
            disabled={disabled}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Topic Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="space-y-2"
        >
          <Label htmlFor="topic">Enter Topic (optional)</Label>
          <Input
            id="topic"
            type="text"
            placeholder="e.g., Java, Networking, Operating Systems"
            value={config.topic || ''}
            onChange={(e) => updateConfig('topic', e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Specify a topic to generate questions exclusively about it
          </p>
        </motion.div>

        {/* Difficulty Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="space-y-2"
        >
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            value={config.difficulty}
            onValueChange={(value) => updateConfig('difficulty', value as 'easy' | 'medium' | 'hard')}
            disabled={disabled}
          >
            <SelectTrigger id="difficulty">
              <SelectValue placeholder="Select a difficulty level" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Difficulty Levels</SelectLabel>
                {availableDifficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Question Count */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-2"
        >
          <Label htmlFor="questionCount">Number of Questions</Label>
          <Input
            id="questionCount"
            type="number"
            min={1}
            max={50}
            value={config.questionCount || ''}
            onChange={(e) => updateConfig('questionCount', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Choose between 1 and 50 questions
          </p>
        </motion.div>

        {/* Question Types */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="space-y-3"
        >
          <Label>Question Types</Label>
          <div className="space-y-2">
            {QUESTION_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={config.questionTypes.includes(type.value)}
                  onCheckedChange={() => toggleQuestionType(type.value)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`type-${type.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select at least one question type
          </p>
        </motion.div>

        {/* Timed Mode */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="timedMode" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timed Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable countdown timer for the quiz
              </p>
            </div>
            <Switch
              id="timedMode"
              checked={config.timedMode}
              onCheckedChange={(checked) => updateConfig('timedMode', checked)}
              disabled={disabled}
            />
          </div>

          {config.timedMode && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={30}
                max={3600}
                value={config.timeLimit || ''}
                onChange={(e) => updateConfig('timeLimit', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                {config.timeLimit ? `${Math.floor(config.timeLimit / 60)} minutes ${config.timeLimit % 60} seconds` : ''}
              </p>
            </div>
          )}
        </motion.div>

        {/* AI Mode */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <Label htmlFor="aiMode" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              AI Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Generate questions using AI instead of database
            </p>
          </div>
          <Switch
            id="aiMode"
            checked={config.aiMode}
            onCheckedChange={(checked) => updateConfig('aiMode', checked)}
            disabled={disabled}
          />
        </motion.div>

        {/* Fullscreen Mode */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <Label htmlFor="fullscreenMode" className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Fullscreen Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Enter fullscreen during quiz — exiting fullscreen will prompt to end the test
            </p>
          </div>
          <Switch
            id="fullscreenMode"
            checked={config.fullscreenMode || false}
            onCheckedChange={(checked) => updateConfig('fullscreenMode', checked)}
            disabled={disabled}
          />
        </motion.div>

        {/* Available Questions Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="glass-light p-4 rounded-md space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Available Questions:
              {config.aiMode && <span className="text-xs text-muted-foreground ml-1">(AI Generated)</span>}
            </span>
            <Badge variant={config.aiMode || (availableCount && availableCount > 0) ? "default" : "destructive"}>
              {config.aiMode ? (
                // Display user-requested count when AI mode is enabled (Req 28.1)
                config.questionCount
              ) : isCountLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                availableCount ?? 0
              )}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Category:</span>
            <span className="font-medium">{config.category}</span>
          </div>
          {config.topic && config.topic.trim() !== '' && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Topic:</span>
              <span className="font-medium">{config.topic}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Difficulty:</span>
            <span className="font-medium">
              {config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Question Types:</span>
            <span className="font-medium">{config.questionTypes.length} selected</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode:</span>
            <span className="font-medium">
              {config.timedMode ? 'Timed' : 'Untimed'}
              {config.fullscreenMode ? ' • Fullscreen' : ''}
            </span>
          </div>
        </motion.div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
          </motion.div>
        )}

        {/* Save and Favorite Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          className="flex gap-2"
        >
          <SaveQuizButton
            category={config.category}
            difficulty={config.difficulty}
            questionCount={config.questionCount}
            questionTypes={config.questionTypes}
            disabled={disabled}
          />
          <FavoriteQuizButton
            category={config.category}
            difficulty={config.difficulty}
            questionCount={config.questionCount}
            questionTypes={config.questionTypes}
            disabled={disabled}
          />
        </motion.div>

        {/* Start Quiz Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <Button
          className="w-full"
          onClick={handleStartQuiz}
          disabled={!canStartQuiz || isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <ListChecks className="mr-2 h-4 w-4" />
              Start Quiz
            </>
          )}
        </Button>
        </motion.div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
