import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { StudyPlanCard } from "@/components/StudyPlanCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Loader2,
  Star,
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash,
  Target,
  TrendingUp,
  BookOpen,
} from "lucide-react";

// Types for study plans
interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  completed: boolean;
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
  // Optional fields for display
  subject?: string;
  difficulty?: string;
}

export default function StudyPlanner() {
  // Persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('studyPlannerActiveTab') || "all";
  });
  
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [newPlan, setNewPlan] = useState<{
    title: string;
    description: string;
    subject: string;
    difficulty: string;
    topic: string; // For AI generation
    scheduleData?: any[];
    preferences?: {
      dailyTimeAvailable?: number;
      preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'flexible';
      currentLevel?: 'beginner' | 'intermediate' | 'advanced';
      learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    };
  }>({
    title: "",
    description: "",
    subject: "general",
    difficulty: "medium",
    topic: "",
    scheduleData: undefined,
    preferences: {
      dailyTimeAvailable: 60,
      preferredTimeOfDay: 'flexible',
      currentLevel: 'beginner',
      learningStyle: 'reading',
    },
  });

  const { toast } = useToast();
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('studyPlannerActiveTab', activeTab);
  }, [activeTab]);

  // Get all study plans
  const { data: studyPlans, isLoading, refetch } = useQuery({
    queryKey: ['/api/study-plans'],
    queryFn: async () => {
      const response = await apiRequest<{ plans: StudyPlan[] }>('/api/study-plans');
      return response?.plans || [];
    }
  });

  // Create a new study plan
  const createStudyPlanMutation = useMutation({
    mutationFn: async (studyPlanData: any) => {
      return apiRequest<StudyPlan>('/api/study-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studyPlanData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Study plan created",
        description: "Your study plan has been created successfully.",
      });
      setNewPlan({
        title: "",
        description: "",
        subject: "general",
        difficulty: "medium",
        topic: "",
        scheduleData: undefined,
      });
      setDateRange({ from: undefined, to: undefined });
      setIsCreatingPlan(false);
      refetch();
    },
    onError: (error: any) => {

      toast({
        title: "Error creating study plan",
        description: error?.message || "There was an error creating your study plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate a study plan with AI
  const generateStudyPlanMutation = useMutation({
    mutationFn: async (data: { topic: string; preferences?: any }) => {
      return apiRequest<Partial<StudyPlan>>('/api/study-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic: data.topic,
          preferences: data.preferences,
        }),
      });
    },
    onSuccess: (data) => {
      if (data) {
        setNewPlan({
          title: data.title || "",
          description: data.description || "",
          subject: data.subject || "general",
          difficulty: data.difficulty || "medium",
          topic: newPlan.topic,
          preferences: newPlan.preferences,
        });
        
        if (data.startDate && data.endDate) {
          setDateRange({
            from: new Date(data.startDate),
            to: new Date(data.endDate),
          });
        }
        
        // Store the generated schedule data
        if (data.scheduleData) {
          setNewPlan(prev => ({ ...prev, scheduleData: Array.isArray(data.scheduleData) ? data.scheduleData : [] }));
        }
        
        toast({
          title: "Study plan generated",
          description: "AI has generated a personalized study plan for you. Edit if needed before saving.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error generating study plan",
        description: "There was an error generating your study plan. Please try again.",
        variant: "destructive",
      });

    },
  });

  // Complete a study plan item
  const completeStudyPlanItemMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: number; itemId: string }) => {
      return apiRequest<any>(`/api/study-plans/${planId}/items/${itemId}/complete`, {
        method: 'PATCH',
      });
    },
    onSuccess: (data) => {
      refetch();
      toast({
        title: "Item completed",
        description: data.pointsAwarded 
          ? `Study item marked as completed. Earned +${data.pointsAwarded} XP!` 
          : "Study item marked as completed.",
      });
    },
  });

  // Delete a study plan
  const deleteStudyPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiRequest(`/api/study-plans/${planId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Study plan deleted",
        description: "Your study plan has been deleted.",
      });
    },
  });
  
  // Generate study items for a plan
  const generateItemsMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/generate-items`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Study items generated",
        description: "AI has generated study items for your plan.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating items",
        description: "There was an error generating study items. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Add a single study item to a plan
  const addStudyItemMutation = useMutation({
    mutationFn: async ({ planId, item }: { planId: number; item: { title: string; description: string; duration: number } }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Item added",
        description: "Study item has been added to your plan.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding item",
        description: "There was an error adding the study item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Edit study plan
  const editStudyPlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: number; data: Partial<StudyPlan> }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Plan updated",
        description: "Your study plan has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating plan",
        description: "There was an error updating your study plan. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Edit study item
  const editStudyItemMutation = useMutation({
    mutationFn: async ({ planId, itemId, data }: { planId: number; itemId: string; data: { title: string; description: string; duration: number } }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Item updated",
        description: "Study item has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating item",
        description: "There was an error updating the study item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete study item
  const deleteStudyItemMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: number; itemId: string }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/items/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Item deleted",
        description: "Study item has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting item",
        description: "There was an error deleting the study item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Reschedule study plan
  const reschedulePlanMutation = useMutation({
    mutationFn: async ({ planId, strategy }: { planId: number; strategy: 'next-available' | 'spread-evenly' | 'compress' }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategy }),
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Plan rescheduled",
        description: "Your study plan has been rescheduled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error rescheduling",
        description: "There was an error rescheduling your study plan.",
        variant: "destructive",
      });
    },
  });
  
  // Toggle reminders
  const toggleRemindersMutation = useMutation({
    mutationFn: async ({ planId, enabled, reminderTime }: { planId: number; enabled: boolean; reminderTime?: string }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/reminders`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled, reminderTime }),
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Reminders updated",
        description: "Your reminder settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating reminders",
        description: "There was an error updating your reminder settings.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleCreateStudyPlan = () => {
    if (!newPlan.title || !dateRange.from || !dateRange.to) {
      toast({
        title: "Missing information",
        description: "Please provide a title and date range for your study plan.",
        variant: "destructive",
      });
      return;
    }

    createStudyPlanMutation.mutate({
      title: newPlan.title,
      description: newPlan.description || "",
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      scheduleData: newPlan.scheduleData || [],
    });
  };

  // Mark a study item as completed
  const markItemAsCompleted = (planId: number, itemId: string) => {
    completeStudyPlanItemMutation.mutate({ planId, itemId });
  };

  // Calculate progress percentage for a study plan
  const calculateProgress = (plan: StudyPlan) => {
    const items = typeof plan.scheduleData === 'string' 
      ? JSON.parse(plan.scheduleData || '[]') 
      : plan.scheduleData || [];
    
    if (items.length === 0) return 0;
    const completedItems = items.filter((item: StudyPlanItem) => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  };

  // Format date range for display
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return 'No dates set';
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Get upcoming items (not completed, sorted by date)
  const getUpcomingItems = () => {
    if (!studyPlans) return [];
    
    const allItems = studyPlans.flatMap(plan => {
      const items = typeof plan.scheduleData === 'string' 
        ? JSON.parse(plan.scheduleData || '[]') 
        : plan.scheduleData || [];
      
      return items
        .filter((item: StudyPlanItem) => !item.completed)
        .map((item: StudyPlanItem) => ({ ...item, planId: plan.id, planTitle: plan.title }));
    });
    
    return allItems.slice(0, 5); // Return top 5 upcoming items
  };

  const upcomingItems = getUpcomingItems();

  // Filter plans by status
  const activePlans = studyPlans?.filter(plan => calculateProgress(plan) < 100) || [];
  const completedPlans = studyPlans?.filter(plan => calculateProgress(plan) === 100) || [];

  return (
    <DashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                  Study Planner
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Organize your learning journey with AI-powered planning
                </p>
              </div>
              <Dialog open={isCreatingPlan} onOpenChange={setIsCreatingPlan}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Study Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Study Plan</DialogTitle>
                    <DialogDescription>
                      Create a new study plan or generate one with AI.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <Label htmlFor="topic" className="mt-2">
                        Generate with AI:
                      </Label>
                      <div className="flex gap-2 flex-1">
                        <Input
                          id="topic"
                          placeholder="Enter a topic or subject..."
                          className="flex-1"
                          value={newPlan.topic}
                          onChange={(e) => setNewPlan({ ...newPlan, topic: e.target.value })}
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            if (newPlan.topic) {
                              generateStudyPlanMutation.mutate({
                                topic: newPlan.topic,
                                preferences: newPlan.preferences,
                              });
                            } else {
                              toast({
                                title: "Missing topic",
                                description: "Please enter a topic for AI generation.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={generateStudyPlanMutation.isPending}
                        >
                          {generateStudyPlanMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newPlan.title}
                        onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newPlan.description}
                        onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select
                          value={newPlan.subject}
                          onValueChange={(value) => setNewPlan({ ...newPlan, subject: value })}
                        >
                          <SelectTrigger id="subject">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="math">Math</SelectItem>
                            <SelectItem value="science">Science</SelectItem>
                            <SelectItem value="history">History</SelectItem>
                            <SelectItem value="literature">Literature</SelectItem>
                            <SelectItem value="programming">Programming</SelectItem>
                            <SelectItem value="languages">Languages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select
                          value={newPlan.difficulty}
                          onValueChange={(value) => setNewPlan({ ...newPlan, difficulty: value })}
                        >
                          <SelectTrigger id="difficulty">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !dateRange.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? (
                              dateRange.to ? (
                                `${format(dateRange.from, "LLL dd, y")} - ${format(
                                  dateRange.to,
                                  "LLL dd, y"
                                )}`
                              ) : (
                                format(dateRange.from, "LLL dd, y")
                              )
                            ) : (
                              "Select date range"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange.from}
                            selected={dateRange}
                            onSelect={(range) => 
                              setDateRange({
                                from: range?.from,
                                to: range?.to,
                              })
                            }
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {newPlan.scheduleData && newPlan.scheduleData.length > 0 && (
                      <div className="grid gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <Label className="text-green-700 dark:text-green-400">
                            {newPlan.scheduleData.length} study items generated
                          </Label>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500">
                          Your study plan includes {newPlan.scheduleData.length} tasks to help you learn {newPlan.topic}
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreatingPlan(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleCreateStudyPlan} disabled={createStudyPlanMutation.isPending}>
                      {createStudyPlanMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Study Plan"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left column: Overview and upcoming items */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Upcoming Tasks
                    </CardTitle>
                    <CardDescription>Your next study items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center my-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : upcomingItems.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 text-sm">No upcoming study tasks</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingItems.map((item: any) => (
                          <motion.div 
                            key={item.id} 
                            className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="mt-0.5">
                              <FileText className="h-5 w-5 text-primary/60" />
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.planTitle}</p>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{item.duration} min</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 flex-shrink-0" 
                              onClick={() => markItemAsCompleted(item.planId as number, item.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Stats & Progress
                    </CardTitle>
                    <CardDescription>Your study achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center my-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : !studyPlans || studyPlans.length === 0 ? (
                      <div className="text-center py-6">
                        <Star className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 text-sm">No study plans yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 text-center border border-primary/20">
                            <p className="text-3xl font-bold text-primary">{studyPlans.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Study Plans</p>
                          </div>
                          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 text-center border border-green-500/20">
                            <p className="text-3xl font-bold text-green-600">
                              {studyPlans.reduce((total, plan) => {
                                const items = typeof plan.scheduleData === 'string' 
                                  ? JSON.parse(plan.scheduleData || '[]') 
                                  : plan.scheduleData || [];
                                return total + items.filter((item: StudyPlanItem) => item.completed).length;
                              }, 0)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Completed</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Recently Active</h4>
                          {studyPlans.slice(0, 3).map(plan => (
                            <div key={plan.id} className="flex justify-between items-center py-2">
                              <span className="text-sm truncate max-w-[150px]">{plan.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {calculateProgress(plan)}%
                                </span>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all" 
                                    style={{ width: `${calculateProgress(plan)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right column: Study plans */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-4 w-full mb-4">
                    <TabsTrigger value="all">All Plans</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="space-y-4">
                    {isLoading ? (
                      <div className="flex justify-center my-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : !studyPlans || studyPlans.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border-2 border-dashed border-muted-foreground/20"
                      >
                        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Study Plans Yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-4 text-sm">
                          Create your first study plan to start organizing your learning journey.
                        </p>
                        <Button className="mt-4" onClick={() => setIsCreatingPlan(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Study Plan
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {studyPlans.map((plan, index) => (
                          <StudyPlanCard
                            key={plan.id}
                            plan={plan}
                            index={index}
                            onDelete={(planId) => deleteStudyPlanMutation.mutate(planId)}
                            onEdit={(planId, data) => editStudyPlanMutation.mutate({ planId, data })}
                            onCompleteItem={markItemAsCompleted}
                            onEditItem={(planId, itemId, data) => editStudyItemMutation.mutate({ planId, itemId, data })}
                            onDeleteItem={(planId, itemId) => deleteStudyItemMutation.mutate({ planId, itemId })}
                            onGenerateItems={(planId) => generateItemsMutation.mutate(planId)}
                            onAddItem={(planId, item) => addStudyItemMutation.mutate({ planId, item })}
                            isGenerating={generateItemsMutation.isPending}
                            isAddingItem={addStudyItemMutation.isPending}
                            isEditingPlan={editStudyPlanMutation.isPending}
                            isEditingItem={editStudyItemMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="active" className="space-y-4">
                    {isLoading ? (
                      <div className="flex justify-center my-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : activePlans.length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No active study plans</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {activePlans.map((plan, index) => (
                          <StudyPlanCard
                            key={plan.id}
                            plan={plan}
                            index={index}
                            onDelete={(planId) => deleteStudyPlanMutation.mutate(planId)}
                            onEdit={(planId, data) => editStudyPlanMutation.mutate({ planId, data })}
                            onCompleteItem={markItemAsCompleted}
                            onEditItem={(planId, itemId, data) => editStudyItemMutation.mutate({ planId, itemId, data })}
                            onDeleteItem={(planId, itemId) => deleteStudyItemMutation.mutate({ planId, itemId })}
                            onGenerateItems={(planId) => generateItemsMutation.mutate(planId)}
                            onAddItem={(planId, item) => addStudyItemMutation.mutate({ planId, item })}
                            isGenerating={generateItemsMutation.isPending}
                            isAddingItem={addStudyItemMutation.isPending}
                            isEditingPlan={editStudyPlanMutation.isPending}
                            isEditingItem={editStudyItemMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="completed" className="space-y-4">
                    {isLoading ? (
                      <div className="flex justify-center my-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : completedPlans.length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <CheckCircle2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No completed study plans yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {completedPlans.map((plan, index) => (
                          <StudyPlanCard
                            key={plan.id}
                            plan={plan}
                            index={index}
                            onDelete={(planId) => deleteStudyPlanMutation.mutate(planId)}
                            onEdit={(planId, data) => editStudyPlanMutation.mutate({ planId, data })}
                            onCompleteItem={markItemAsCompleted}
                            onEditItem={(planId, itemId, data) => editStudyItemMutation.mutate({ planId, itemId, data })}
                            onDeleteItem={(planId, itemId) => deleteStudyItemMutation.mutate({ planId, itemId })}
                            onGenerateItems={(planId) => generateItemsMutation.mutate(planId)}
                            onAddItem={(planId, item) => addStudyItemMutation.mutate({ planId, item })}
                            isGenerating={generateItemsMutation.isPending}
                            isAddingItem={addStudyItemMutation.isPending}
                            isEditingPlan={editStudyPlanMutation.isPending}
                            isEditingItem={editStudyItemMutation.isPending}
                            isCompleted={true}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="calendar" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Schedule</CardTitle>
                          <CardDescription>Select a date to view study tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                          <Calendar
                            mode="single"
                            selected={calendarDate}
                            onSelect={setCalendarDate}
                            className="rounded-md border shadow"
                            modifiers={{
                              hasTasks: (date) => {
                                if (!studyPlans) return false;
                                return studyPlans.some(plan => {
                                  if (plan.status === 'completed') return false;
                                  const items = typeof plan.scheduleData === 'string' ? JSON.parse(plan.scheduleData || '[]') : (plan.scheduleData || []);
                                  return items.some((item: any) => {
                                    if (!item.scheduledDate) return false;
                                    const itemDate = new Date(item.scheduledDate);
                                    return itemDate.getDate() === date.getDate() &&
                                           itemDate.getMonth() === date.getMonth() &&
                                           itemDate.getFullYear() === date.getFullYear();
                                  });
                                });
                              }
                            }}
                            modifiersStyles={{
                              hasTasks: { fontWeight: 'bold', textDecoration: 'underline' }
                            }}
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            Tasks for {calendarDate ? format(calendarDate, "MMM d, yyyy") : "Select date"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {studyPlans?.map(plan => {
                              if (plan.status === 'completed') return null;
                              const items = typeof plan.scheduleData === 'string' ? JSON.parse(plan.scheduleData || '[]') : (plan.scheduleData || []);
                              const todaysItems = items.filter((item: any) => {
                                if (!item.scheduledDate || !calendarDate) return false;
                                const itemDate = new Date(item.scheduledDate);
                                return itemDate.getDate() === calendarDate.getDate() &&
                                       itemDate.getMonth() === calendarDate.getMonth() &&
                                       itemDate.getFullYear() === calendarDate.getFullYear();
                              });
                              
                              if (todaysItems.length === 0) return null;
                              
                              return (
                                <div key={plan.id} className="mb-4">
                                  <h4 className="font-semibold text-sm mb-2">{plan.title}</h4>
                                  {todaysItems.map((item: any) => (
                                    <div key={item.id} className="flex items-start space-x-3 p-3 mb-2 rounded-lg bg-muted/50">
                                      <div className="mt-0.5">
                                        <FileText className="h-5 w-5 text-primary/60" />
                                      </div>
                                      <div className="flex-1 space-y-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.title}</p>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                          <Clock className="h-3 w-3 mr-1" />
                                          <span>{item.duration} min</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                            {!studyPlans?.some(plan => {
                              if (plan.status === 'completed') return false;
                              const items = typeof plan.scheduleData === 'string' ? JSON.parse(plan.scheduleData || '[]') : (plan.scheduleData || []);
                              return items.some((item: any) => {
                                if (!item.scheduledDate || !calendarDate) return false;
                                const itemDate = new Date(item.scheduledDate);
                                return itemDate.getDate() === calendarDate.getDate() &&
                                       itemDate.getMonth() === calendarDate.getMonth() &&
                                       itemDate.getFullYear() === calendarDate.getFullYear();
                              });
                            }) && (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground text-sm">No tasks scheduled for this date</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
