import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    documents: 0,
    flashcards: 0,
    quizzes: 0,
    codeSnippets: 0,
    studyTime: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch("/api/user-stats");
        
        if (!response.ok) {
          throw new Error("Failed to load user statistics");
        }
        
        const data = await response.json();
        
        setStats({
          documents: data.stats.documentsUploaded || 0,
          flashcards: data.stats.flashcardsCreated || 0,
          quizzes: data.stats.quizzesCompleted || 0,
          codeSnippets: data.stats.codeSnippetsGenerated || 0,
          studyTime: data.stats.totalStudyTime || 0,
          streak: data.stats.streakDays || 0,
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your statistics. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserStats();
  }, [toast]);

  // Calculate stats for display
  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const features = [
    {
      title: "AI Chat Assistant",
      description: "Ask questions and get instant help with your studies",
      icon: <Icons.messageCircle className="h-6 w-6" />,
      onClick: () => navigate("/chat"),
    },
    {
      title: "Document Management",
      description: "Upload study materials and get AI-powered summaries",
      icon: <Icons.fileText className="h-6 w-6" />,
      onClick: () => navigate("/documents"),
    },
    {
      title: "Flashcards",
      description: "Create and review flashcards for effective learning",
      icon: <Icons.bookOpen className="h-6 w-6" />,
      onClick: () => navigate("/flashcards"),
    },
    {
      title: "Quiz Mode",
      description: "Test your knowledge with AI-generated quizzes",
      icon: <Icons.fileQuestion className="h-6 w-6" />,
      onClick: () => navigate("/quiz"),
    },
    {
      title: "Code Generator",
      description: "Generate code snippets for programming challenges",
      icon: <Icons.code className="h-6 w-6" />,
      onClick: () => navigate("/code-generator"),
    },
    {
      title: "Study Planner",
      description: "Organize your study schedule with AI assistance",
      icon: <Icons.calendar className="h-6 w-6" />,
      onClick: () => navigate("/study-planner"),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.fullName || user?.username}!</h1>
            <p className="text-gray-500 mt-1">
              Let's continue your learning journey
            </p>
          </div>
          <Button onClick={() => navigate("/chat")}>
            <Icons.messageSquare className="mr-2 h-4 w-4" />
            Start a New Conversation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Study Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icons.award className="h-8 w-8 text-yellow-500 mr-2" />
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.streak} days</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Study Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icons.clock className="h-8 w-8 text-blue-500 mr-2" />
                <div className="text-2xl font-bold">{isLoading ? "..." : formatStudyTime(stats.studyTime)}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Resources Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icons.page className="h-8 w-8 text-green-500 mr-2" />
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : (stats.documents + stats.flashcards + stats.codeSnippets)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <h2 className="text-2xl font-bold mt-8 mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-primary/10">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={feature.onClick}>
                  Open
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}