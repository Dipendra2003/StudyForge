import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash,
  Trash2,
  Play,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { AddStudyItemDialog } from "./AddStudyItemDialog";
import { EditStudyPlanDialog } from "./EditStudyPlanDialog";
import { EditStudyItemDialog } from "./EditStudyItemDialog";

interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
  actionType?: "quiz" | "flashcards" | "read";
  actionQuery?: string;
}

interface StudyPlan {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  scheduleData: StudyPlanItem[] | string | null;
  startDate: string | null;
  endDate: string | null;
  completedPercentage: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  subject?: string;
  difficulty?: string;
}

interface StudyPlanCardProps {
  plan: StudyPlan;
  index: number;
  onDelete: (planId: number) => void;
  onEdit: (planId: number, data: Partial<StudyPlan>) => void;
  onCompleteItem: (planId: number, itemId: string) => void;
  onEditItem: (planId: number, itemId: string, data: { title: string; description: string; duration: number }) => void;
  onDeleteItem: (planId: number, itemId: string) => void;
  onGenerateItems: (planId: number) => void;
  onAddItem: (planId: number, item: { title: string; description: string; duration: number }) => void;
  isGenerating: boolean;
  isAddingItem: boolean;
  isEditingPlan: boolean;
  isEditingItem: boolean;
  isCompleted?: boolean;
}

export function StudyPlanCard({
  plan,
  index,
  onDelete,
  onEdit,
  onCompleteItem,
  onEditItem,
  onDeleteItem,
  onGenerateItems,
  onAddItem,
  isGenerating,
  isAddingItem,
  isEditingPlan,
  isEditingItem,
  isCompleted = false,
}: StudyPlanCardProps) {
  const [, setLocation] = useLocation();
  const items = typeof plan.scheduleData === 'string' 
    ? JSON.parse(plan.scheduleData || '[]') 
    : plan.scheduleData || [];
  
  const calculateProgress = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter((item: StudyPlanItem) => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  };
  
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return 'No dates set';
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };
  
  const progress = calculateProgress();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn(
        "overflow-hidden border-2 hover:shadow-lg transition-all",
        isCompleted 
          ? "border-green-500/20 hover:border-green-500/30" 
          : "hover:border-primary/30"
      )}>
        <CardHeader className={cn(
          "pb-4",
          isCompleted 
            ? "bg-gradient-to-r from-green-500/5 to-transparent" 
            : "bg-gradient-to-r from-primary/5 to-transparent"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{plan.title}</CardTitle>
                {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                  {plan.subject}
                </span>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {plan.difficulty}
                </span>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                  <CalendarIcon className="inline h-3 w-3 mr-1" />
                  {formatDateRange(plan.startDate, plan.endDate)}
                </span>
              </div>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
            </div>
            <div className="flex gap-1">
              <EditStudyPlanDialog 
                plan={plan}
                onEdit={onEdit}
                isEditing={isEditingPlan}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(plan.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">Progress</h4>
              <span className={cn(
                "text-sm font-medium",
                isCompleted ? "text-green-600" : "text-primary"
              )}>
                {isCompleted ? "100% Complete" : `${progress}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn(
                  "h-full",
                  isCompleted 
                    ? "bg-gradient-to-r from-green-500 to-green-600" 
                    : "bg-gradient-to-r from-primary to-primary/80"
                )}
              />
            </div>
          </div>
          
          {items.length === 0 ? (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">No study items yet</p>
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onGenerateItems(plan.id)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Items with AI
                    </>
                  )}
                </Button>
                <AddStudyItemDialog 
                  planId={plan.id} 
                  onAdd={onAddItem}
                  isAdding={isAddingItem}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Study Items</h4>
                {!isCompleted && (
                  <AddStudyItemDialog 
                    planId={plan.id} 
                    onAdd={onAddItem}
                    isAdding={isAddingItem}
                  />
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map((item: StudyPlanItem) => (
                  <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md hover:bg-muted transition-colors group">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0",
                        item.completed 
                          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-500" 
                          : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      )}>
                        {item.completed && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          item.completed && "line-through text-gray-400"
                        )}>
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">{item.duration} min</p>
                      </div>
                    </div>
                    
                    {/* ACTION LINKS */}
                    {!item.completed && item.actionType && item.actionType !== "read" && item.actionQuery && (
                      <div className="ml-2 mr-4 flex-shrink-0">
                        {item.actionType === "quiz" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 bg-primary/5 text-primary hover:bg-primary/15 border-primary/20"
                            onClick={() => setLocation(`/quiz-mode?category=${encodeURIComponent(item.actionQuery!)}&difficulty=${plan.difficulty || 'medium'}&qotd=false`)}
                          >
                            <Play className="h-3 w-3" />
                            Launch Quiz
                          </Button>
                        )}
                        {item.actionType === "flashcards" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 bg-orange-500/5 text-orange-600 hover:bg-orange-500/15 border-orange-500/20"
                            onClick={() => setLocation(`/flashcards?topic=${encodeURIComponent(item.actionQuery!)}`)}
                          >
                            <Zap className="h-3 w-3" />
                            Flashcards
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!item.completed && !isCompleted && (
                        <>
                          <EditStudyItemDialog
                            planId={plan.id}
                            item={item}
                            onEdit={onEditItem}
                            isEditing={isEditingItem}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onDeleteItem(plan.id, item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                      {!item.completed && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => onCompleteItem(plan.id, item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
