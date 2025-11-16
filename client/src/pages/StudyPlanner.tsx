import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import queryClient from "@/lib/queryClient";
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
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MoreVertical,
  Loader2,
  Star,
  CheckCircle2,
  ArrowRight,
  FileText,
  RefreshCw,
  Trash,
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
  description: string;
  subject: string;
  difficulty: string;
  startDate: string;
  endDate: string;
  items: StudyPlanItem[];
  createdAt: string;
}

export default function StudyPlanner() {
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
  }>({
    title: "",
    description: "",
    subject: "general",
    difficulty: "medium",
    topic: "",
  });

  const { toast } = useToast();

  // Get all study plans
  const { data: studyPlans, isLoading, refetch } = useQuery({
    queryKey: ['/api/study-plans'],
    queryFn: async () => {
      const response = await apiRequest<{ studyPlans: StudyPlan[] } | { data: StudyPlan[] }>('/api/study-plans');
      // Handle both response formats (direct studyPlans array or paginated response)
      if (response && 'studyPlans' in response) {
        return response.studyPlans || [];
      } else if (response && 'data' in response) {
        return response.data || [];
      }
      return [];
    }
  });

  // Create a new study plan
  const createStudyPlanMutation = useMutation({
    mutationFn: async (studyPlanData: Partial<StudyPlan>) => {
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
      });
      setDateRange({ from: undefined, to: undefined });
      setIsCreatingPlan(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error creating study plan",
        description: "There was an error creating your study plan. Please try again.",
        variant: "destructive",
      });
      console.error("Create study plan error:", error);
    },
  });

  // Generate a study plan with AI
  const generateStudyPlanMutation = useMutation({
    mutationFn: async (topic: string) => {
      return apiRequest<Partial<StudyPlan>>('/api/study-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
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
        });
        
        if (data.startDate && data.endDate) {
          setDateRange({
            from: new Date(data.startDate),
            to: new Date(data.endDate),
          });
        }
        
        toast({
          title: "Study plan generated",
          description: "AI has generated a study plan for you. Edit if needed before saving.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error generating study plan",
        description: "There was an error generating your study plan. Please try again.",
        variant: "destructive",
      });
      console.error("Generate study plan error:", error);
    },
  });

  // Complete a study plan item
  const completeStudyPlanItemMutation = useMutation({
    mutationFn: async ({ planId, itemId }: { planId: number; itemId: string }) => {
      return apiRequest<StudyPlan>(`/api/study-plans/${planId}/items/${itemId}/complete`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Item completed",
        description: "Study item marked as completed.",
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
      description: newPlan.description,
      subject: newPlan.subject,
      difficulty: newPlan.difficulty,
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      items: [],
    });
  };

  // Mark a study item as completed
  const markItemAsCompleted = (planId: number, itemId: string) => {
    completeStudyPlanItemMutation.mutate({ planId, itemId });
  };

  // Calculate progress percentage for a study plan
  const calculateProgress = (plan: StudyPlan) => {
    if (plan.items.length === 0) return 0;
    const completedItems = plan.items.filter(item => item.completed).length;
    return Math.round((completedItems / plan.items.length) * 100);
  };

  // Format date range for display
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Group plans by subject
  const plansBySubject = studyPlans?.reduce<Record<string, StudyPlan[]>>((acc, plan) => {
    const subject = plan.subject || 'general';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(plan);
    return acc;
  }, {}) || {};

  // Get upcoming items (not completed, sorted by date)
  const getUpcomingItems = () => {
    if (!studyPlans) return [];
    
    const allItems = studyPlans.flatMap(plan => 
      plan.items
        .filter(item => !item.completed)
        .map(item => ({ ...item, planId: plan.id, planTitle: plan.title }))
    );
    
    return allItems.slice(0, 5); // Return top 5 upcoming items
  };

  const upcomingItems = getUpcomingItems();

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Study Planner</h1>
          <Dialog open={isCreatingPlan} onOpenChange={setIsCreatingPlan}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Study Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Study Plan</DialogTitle>
                <DialogDescription>
                  Create a new study plan or generate one with AI.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex justify-between">
                  <Label htmlFor="topic" className="mt-2">
                    Generate with AI:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="topic"
                      placeholder="Enter a topic or subject..."
                      className="w-64"
                      value={newPlan.topic}
                      onChange={(e) => setNewPlan({ ...newPlan, topic: e.target.value })}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (newPlan.topic) {
                          generateStudyPlanMutation.mutate(newPlan.topic);
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
                <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Overview and upcoming items */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
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
                    <p className="text-gray-500">No upcoming study tasks</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 rounded-md bg-muted/50">
                        <div className="mt-0.5">
                          <FileText className="h-5 w-5 text-primary/60" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.planTitle}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{item.duration} min</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => markItemAsCompleted(item.planId as number, item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stats & Progress</CardTitle>
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
                    <p className="text-gray-500">No study plans yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold">{studyPlans.length}</p>
                        <p className="text-sm text-muted-foreground">Study Plans</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold">
                          {studyPlans.reduce((total, plan) => 
                            total + plan.items.filter(item => item.completed).length, 0
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">Completed Tasks</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recently Active</h4>
                      {studyPlans.slice(0, 3).map(plan => (
                        <div key={plan.id} className="flex justify-between items-center py-2">
                          <span className="text-sm truncate max-w-[150px]">{plan.title}</span>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-2">
                              {calculateProgress(plan)}%
                            </span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
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
          </div>

          {/* Right column: Study plans */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="all">All Plans</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center my-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !plansBySubject || Object.keys(plansBySubject).length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold">No Study Plans Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto my-2">
                      Create your first study plan to start organizing your learning journey.
                    </p>
                    <Button className="mt-4" onClick={() => setIsCreatingPlan(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Study Plan
                    </Button>
                  </div>
                ) : (
                  Object.entries(plansBySubject).map(([subject, plans]) => (
                    <div key={subject} className="space-y-4">
                      <h2 className="text-xl font-bold capitalize">{subject}</h2>
                      <div className="grid grid-cols-1 gap-4">
                        {plans.map(plan => (
                          <Card key={plan.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-start">
                              <div className="flex-1 p-6">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-bold mb-1">{plan.title}</h3>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                        {plan.subject}
                                      </span>
                                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                        {plan.difficulty}
                                      </span>
                                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                        {formatDateRange(plan.startDate, plan.endDate)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                  </div>
                                  <div className="flex items-center">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => deleteStudyPlanMutation.mutate(plan.id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 mt-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-sm">Progress</h4>
                                    <span className="text-sm font-medium">{calculateProgress(plan)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary" 
                                      style={{ width: `${calculateProgress(plan)}%` }}
                                    />
                                  </div>
                                </div>
                                
                                <div className="mt-4 space-y-2">
                                  <h4 className="font-medium text-sm">Study Items</h4>
                                  {plan.items.length === 0 ? (
                                    <p className="text-sm text-gray-500">No study items added yet.</p>
                                  ) : (
                                    plan.items.map(item => (
                                      <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                        <div className="flex items-center space-x-2">
                                          <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center",
                                            item.completed 
                                              ? "bg-green-100 border-green-300 text-green-500" 
                                              : "bg-gray-100 border-gray-300"
                                          )}>
                                            {item.completed && <CheckCircle2 className="h-3 w-3" />}
                                          </div>
                                          <div>
                                            <p className={cn(
                                              "text-sm",
                                              item.completed && "line-through text-gray-400"
                                            )}>
                                              {item.title}
                                            </p>
                                            <p className="text-xs text-gray-500">{item.duration} min</p>
                                          </div>
                                        </div>
                                        {!item.completed && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 w-7 p-0"
                                            onClick={() => markItemAsCompleted(plan.id, item.id)}
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="active">
                {/* Similar content as "all" but filtered for active plans */}
                {isLoading ? (
                  <div className="flex justify-center my-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {studyPlans && studyPlans.filter(plan => calculateProgress(plan) < 100).length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <p className="text-gray-500">No active study plans</p>
                      </div>
                    ) : (
                      studyPlans?.filter(plan => calculateProgress(plan) < 100).map(plan => (
                        <Card key={plan.id} className="overflow-hidden">
                          {/* Same plan card as in "all" tab */}
                          <div className="flex flex-col md:flex-row md:items-start">
                            <div className="flex-1 p-6">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-bold mb-1">{plan.title}</h3>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                      {plan.subject}
                                    </span>
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                      {plan.difficulty}
                                    </span>
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                      {formatDateRange(plan.startDate, plan.endDate)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                </div>
                                <div className="flex items-center">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => deleteStudyPlanMutation.mutate(plan.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-3 mt-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium text-sm">Progress</h4>
                                  <span className="text-sm font-medium">{calculateProgress(plan)}%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${calculateProgress(plan)}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="mt-4 space-y-2">
                                <h4 className="font-medium text-sm">Study Items</h4>
                                {plan.items.length === 0 ? (
                                  <p className="text-sm text-gray-500">No study items added yet.</p>
                                ) : (
                                  plan.items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className={cn(
                                          "w-5 h-5 rounded-full border flex items-center justify-center",
                                          item.completed 
                                            ? "bg-green-100 border-green-300 text-green-500" 
                                            : "bg-gray-100 border-gray-300"
                                        )}>
                                          {item.completed && <CheckCircle2 className="h-3 w-3" />}
                                        </div>
                                        <div>
                                          <p className={cn(
                                            "text-sm",
                                            item.completed && "line-through text-gray-400"
                                          )}>
                                            {item.title}
                                          </p>
                                          <p className="text-xs text-gray-500">{item.duration} min</p>
                                        </div>
                                      </div>
                                      {!item.completed && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 w-7 p-0"
                                          onClick={() => markItemAsCompleted(plan.id, item.id)}
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed">
                {/* Similar content as "all" but filtered for completed plans */}
                {isLoading ? (
                  <div className="flex justify-center my-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {studyPlans && studyPlans.filter(plan => calculateProgress(plan) === 100).length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <p className="text-gray-500">No completed study plans</p>
                      </div>
                    ) : (
                      studyPlans?.filter(plan => calculateProgress(plan) === 100).map(plan => (
                        <Card key={plan.id} className="overflow-hidden">
                          {/* Same plan card as in "all" tab */}
                          <div className="flex flex-col md:flex-row md:items-start">
                            <div className="flex-1 p-6">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-bold mb-1">{plan.title}</h3>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                      {plan.subject}
                                    </span>
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                      {plan.difficulty}
                                    </span>
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                      {formatDateRange(plan.startDate, plan.endDate)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                </div>
                                <div className="flex items-center">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => deleteStudyPlanMutation.mutate(plan.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-3 mt-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium text-sm">Progress</h4>
                                  <span className="text-sm font-medium">100%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary w-full" />
                                </div>
                              </div>
                              
                              <div className="mt-4 space-y-2">
                                <h4 className="font-medium text-sm">Study Items (Completed)</h4>
                                {plan.items.map(item => (
                                  <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-5 h-5 rounded-full border bg-green-100 border-green-300 text-green-500 flex items-center justify-center">
                                        <CheckCircle2 className="h-3 w-3" />
                                      </div>
                                      <div>
                                        <p className="text-sm line-through text-gray-400">
                                          {item.title}
                                        </p>
                                        <p className="text-xs text-gray-500">{item.duration} min</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}