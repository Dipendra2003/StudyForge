import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";

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
import { TrendingUp, Target, Zap, Brain, Clock, Flame, Lightbulb, Trophy, BookOpen as BookOpenIcon, RefreshCw, CheckCircle, Upload } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { QuizOfTheDay } from "@/components/quiz/QuizOfTheDay";
import { AIInsightsPanel } from "@/components/quiz/AIInsightsPanel";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
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
  const [dueFlashcards, setDueFlashcards] = useState<any[]>([]);
  const [loadingDueCards, setLoadingDueCards] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    const fetchUserStats = async () => {
      try {
        const response = await apiGet("/api/user-stats");
        
        if (!response.ok) {
          // Silently handle authentication errors
          if (response.status === 401) {
            console.log("User statistics requires authentication");
            return;
          }
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
        // Only show toast for non-auth errors
        if (error instanceof Error && !error.message.includes('401')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load your statistics. Please try again later.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchDueFlashcards = async () => {
      try {
        const response = await apiGet("/api/flashcards/due?limit=5");
        
        if (response.ok) {
          const data = await response.json();
          setDueFlashcards(data.flashcards || []);
        }
      } catch (error) {
        console.error("Error fetching due flashcards:", error);
      } finally {
        setLoadingDueCards(false);
      }
    };
    
    const fetchRecommendations = async () => {
      try {
        const response = await apiGet("/api/recommendations");
        
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    
    fetchUserStats();
    fetchDueFlashcards();
    fetchRecommendations();
  }, [toast, isAuthenticated, user]);

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
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Document Management",
      description: "Upload study materials and get AI-powered summaries",
      icon: <Icons.fileText className="h-6 w-6" />,
      onClick: () => navigate("/document-summarization"),
      gradient: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Flashcards",
      description: "Create and review flashcards for effective learning",
      icon: <Icons.bookOpen className="h-6 w-6" />,
      onClick: () => navigate("/flashcards"),
      gradient: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Quiz Mode",
      description: "Test your knowledge with AI-generated quizzes",
      icon: <Icons.fileQuestion className="h-6 w-6" />,
      onClick: () => navigate("/quiz-mode"),
      gradient: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: "Code Generator",
      description: "Generate code snippets for programming challenges",
      icon: <Icons.code className="h-6 w-6" />,
      onClick: () => navigate("/code-generator"),
      gradient: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: "Study Planner",
      description: "Organize your study schedule with AI assistance",
      icon: <Icons.calendar className="h-6 w-6" />,
      onClick: () => navigate("/study-planner"),
      gradient: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/20",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome back, {user?.fullName || user?.username}!
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Let's continue your learning journey
            </p>
          </div>
          <Button 
            onClick={() => navigate("/chat")} 
            size="lg"
            className="w-full md:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
          >
            <Icons.messageSquare className="mr-2 h-5 w-5" />
            Start Conversation
          </Button>
        </motion.div>

        {/* Email Verification Banner */}
        <EmailVerificationBanner show={user !== null && !user.emailVerified} />

        {/* Quiz of the Day */}
        <QuizOfTheDay />

        {/* Saved and Favorite Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <BookOpenIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">My Quizzes</CardTitle>
                    <CardDescription>Saved and favorite quizzes</CardDescription>
                  </div>
                </div>
                <Button onClick={() => navigate("/quiz-mode")}>
                  View All
                  <Icons.arrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icons.award className="h-4 w-4" />
                  Study Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {isLoading ? "..." : stats.streak}
                  </div>
                  <div className="text-lg text-muted-foreground mb-1">days</div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>Keep it up!</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icons.clock className="h-4 w-4" />
                  Total Study Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {isLoading ? "..." : formatStudyTime(stats.studyTime)}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <Target className="h-3 w-3" />
                  <span>Great progress!</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full -mr-16 -mt-16" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icons.page className="h-4 w-4" />
                  Resources Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {isLoading ? "..." : (stats.documents + stats.flashcards + stats.codeSnippets)}
                  </div>
                  <div className="text-lg text-muted-foreground mb-1">total</div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                  <Zap className="h-3 w-3" />
                  <span>You're productive!</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Due Flashcards Widget */}
        {!loadingDueCards && dueFlashcards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background via-background to-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        Due for Review
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {dueFlashcards.length}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Time to reinforce your knowledge
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate("/flashcards")}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Review Now
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dueFlashcards.slice(0, 3).map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                      onClick={() => navigate("/flashcards")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{card.question}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {card.difficulty || 'medium'}
                            </Badge>
                            {card.category && (
                              <span className="text-xs text-muted-foreground">
                                {card.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <Icons.arrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </motion.div>
                  ))}
                  {dueFlashcards.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{dueFlashcards.length - 3} more cards waiting for review
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Insights Panel - Unified Component */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <AIInsightsPanel userId={user.id} />
          </motion.div>
        )}

        {/* Features */}
        
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Explore Features
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Powerful AI tools to enhance your learning experience
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                {features.length} tools available
              </div>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 shadow-md group cursor-pointer bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden relative"
                  onClick={feature.onClick}
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  <CardHeader className="space-y-4 relative z-10">
                    <div className="flex items-start justify-between">
                      <motion.div 
                        className={`rounded-2xl p-4 ${feature.bgColor} shadow-sm group-hover:shadow-lg transition-all duration-300 relative overflow-hidden`}
                        whileHover={{ rotate: [0, -5, 5, -5, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className={`bg-gradient-to-r ${feature.gradient} bg-clip-text`}>
                          <div className="relative z-10">
                            {feature.icon}
                          </div>
                        </div>
                        {/* Icon glow effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />
                      </motion.div>
                      <motion.div 
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                        initial={{ x: -10 }}
                        whileHover={{ x: 0 }}
                      >
                        <div className="rounded-full p-2 bg-primary/10">
                          <Icons.arrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </motion.div>
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors duration-300 font-bold">
                        {feature.title}
                      </CardTitle>
                      <div className={`h-1 w-0 group-hover:w-12 bg-gradient-to-r ${feature.gradient} rounded-full transition-all duration-500 mt-2`} />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10">
                    <CardDescription className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                  
                  <CardFooter className="relative z-10">
                    <Button 
                      variant="ghost" 
                      className={`w-full group-hover:bg-gradient-to-r ${feature.gradient} group-hover:text-white transition-all duration-300 font-medium shadow-none group-hover:shadow-lg`}
                      onClick={(e) => {
                        e.stopPropagation();
                        feature.onClick();
                      }}
                    >
                      <span>Get Started</span>
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.5,
                          ease: "easeInOut"
                        }}
                        className="ml-2"
                      >
                        <Icons.arrowRight className="h-4 w-4" />
                      </motion.div>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}