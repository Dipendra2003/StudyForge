import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { Options as ConfettiOptions } from "canvas-confetti";
import OnboardingCharacter from "./OnboardingCharacter";
import { 
  User, 
  Mail, 
  KeyRound, 
  Sparkles, 
  BookOpen, 
  Brain, 
  Code, 
  Music, 
  Clock, 
  Trophy,
  Github
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { 
  SignupProgress, 
  AchievementBadge, 
  AchievementPopup, 
  type SignupStep 
} from "./SignupProgress";

// Create schemas for each step
const basicInfoSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  fullName: z.string().min(1, "Please enter your name"),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  education: z.string().optional(),
});

const preferencesSchema = z.object({
  preferredLanguage: z.string().default("en"),
  studyHoursWeekly: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  learningStyle: z.string().default("visual"),
  notificationsEnabled: z.boolean().default(true),
});

// Create a combined schema - manually specifying all fields to avoid TypeScript issues
const registerSchema = z.object({
  // Basic info fields
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  
  // Profile fields
  fullName: z.string().min(1, "Please enter your name"),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  education: z.string().optional(),
  
  // Preferences fields
  preferredLanguage: z.string().default("en"),
  studyHoursWeekly: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  learningStyle: z.string().default("visual"),
  notificationsEnabled: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type BasicInfoValues = z.infer<typeof basicInfoSchema>;
type ProfileValues = z.infer<typeof profileSchema>;
type PreferencesValues = z.infer<typeof preferencesSchema>;

// Define achievements
const achievements = [
  {
    id: "account-setup",
    title: "Account Pioneer",
    description: "Created your Jadoo account",
    icon: <User className="h-5 w-5" />,
    step: "basic-info" as SignupStep,
  },
  {
    id: "profile-created",
    title: "Identity Established",
    description: "Set up your learner profile",
    icon: <BookOpen className="h-5 w-5" />,
    step: "profile" as SignupStep,
  },
  {
    id: "preferences-set",
    title: "Learning Pathfinder",
    description: "Defined your learning preferences",
    icon: <Brain className="h-5 w-5" />,
    step: "preferences" as SignupStep,
  },
  {
    id: "signup-complete",
    title: "Ready to Learn",
    description: "Completed your Jadoo onboarding",
    icon: <Trophy className="h-5 w-5" />,
    step: "complete" as SignupStep,
  },
];

export default function GamifiedSignupForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // State for tracking steps
  const [currentStep, setCurrentStep] = useState<SignupStep>("basic-info");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [totalSteps] = useState(3); // Excluding the "complete" step
  
  // State for achievements
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newAchievement, setNewAchievement] = useState<typeof achievements[0] | null>(null);
  
  // Form state management
  const [formData, setFormData] = useState<Partial<RegisterFormValues>>({
    preferredLanguage: "en",
    learningStyle: "visual",
    notificationsEnabled: true,
  });
  
  // Set up form for basic info
  const basicInfoForm = useForm<BasicInfoValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Set up form for profile
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      bio: "",
      education: "",
    },
  });
  
  // Set up form for preferences
  const preferencesForm = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredLanguage: "en",
      studyHoursWeekly: "10-20",
      interestedSubjects: [],
      learningStyle: "visual",
      notificationsEnabled: true,
    },
  });
  
  // Function to handle step completion
  const completeStep = (step: SignupStep, data: any) => {
    // Update form data
    setFormData((prev: Partial<RegisterFormValues>) => ({ ...prev, ...data }));
    
    // Find relevant achievement
    const achievement = achievements.find(a => a.step === step);
    
    // Check if this step unlocks a new achievement
    if (achievement && !unlockedAchievements.includes(achievement.id)) {
      // Add to unlocked achievements
      setUnlockedAchievements(prev => [...prev, achievement.id]);
      
      // Show achievement popup
      setNewAchievement(achievement);
      
      // Play confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    // Update completed steps
    if (step !== "complete") {
      setCompletedSteps(prev => prev + 1);
    }
    
    // Move to next step
    const stepOrder: SignupStep[] = ["basic-info", "profile", "preferences", "complete"];
    const currentIndex = stepOrder.indexOf(step);
    
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };
  
  // Function to handle final submission
  const submitRegistration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      // Play a big confetti celebration
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "Registration successful!",
        description: "Your account has been created. Please log in to continue your learning journey.",
      });
      
      // Navigate to login after a brief delay to show the celebration
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again with different information.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step renderers
  const renderBasicInfoStep = () => (
    <form onSubmit={basicInfoForm.handleSubmit(data => completeStep("basic-info", data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            className="pl-9"
            placeholder="Choose a username"
            {...basicInfoForm.register("username")}
          />
        </div>
        {basicInfoForm.formState.errors.username && (
          <p className="text-sm text-red-500">
            {basicInfoForm.formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            className="pl-9"
            placeholder="Enter your email"
            {...basicInfoForm.register("email")}
          />
        </div>
        {basicInfoForm.formState.errors.email && (
          <p className="text-sm text-red-500">
            {basicInfoForm.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            className="pl-9"
            placeholder="Create a password"
            {...basicInfoForm.register("password")}
          />
        </div>
        {basicInfoForm.formState.errors.password && (
          <p className="text-sm text-red-500">
            {basicInfoForm.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            className="pl-9"
            placeholder="Confirm your password"
            {...basicInfoForm.register("confirmPassword")}
          />
        </div>
        {basicInfoForm.formState.errors.confirmPassword && (
          <p className="text-sm text-red-500">
            {basicInfoForm.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Continue
      </Button>
    </form>
  );
  
  const renderProfileStep = () => (
    <form onSubmit={profileForm.handleSubmit(data => completeStep("profile", data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          placeholder="Enter your full name"
          {...profileForm.register("fullName")}
        />
        {profileForm.formState.errors.fullName && (
          <p className="text-sm text-red-500">
            {profileForm.formState.errors.fullName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="education">Education Level</Label>
        <Select 
          defaultValue=""
          onValueChange={(value) => profileForm.setValue("education", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high-school">High School</SelectItem>
            <SelectItem value="undergraduate">Undergraduate</SelectItem>
            <SelectItem value="graduate">Graduate</SelectItem>
            <SelectItem value="doctorate">Doctorate</SelectItem>
            <SelectItem value="self-taught">Self-taught</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio (Optional)</Label>
        <Input
          id="bio"
          placeholder="Tell us a little about yourself"
          {...profileForm.register("bio")}
        />
      </div>

      <div className="flex gap-2 justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep("basic-info")}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Continue
        </Button>
      </div>
    </form>
  );
  
  const renderPreferencesStep = () => (
    <form onSubmit={preferencesForm.handleSubmit(data => completeStep("preferences", data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="preferredLanguage">Preferred Language</Label>
        <Select 
          defaultValue="en"
          onValueChange={(value) => preferencesForm.setValue("preferredLanguage", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">Hindi</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="ja">Japanese</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Learning Style</Label>
        <Tabs 
          defaultValue="visual" 
          onValueChange={(value) => preferencesForm.setValue("learningStyle", value)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="auditory">Auditory</TabsTrigger>
            <TabsTrigger value="kinesthetic">Hands-on</TabsTrigger>
          </TabsList>
          <TabsContent value="visual" className="p-4 bg-muted/30 rounded-md mt-2 text-sm text-muted-foreground">
            You learn best through images, diagrams, and visual aids.
          </TabsContent>
          <TabsContent value="auditory" className="p-4 bg-muted/30 rounded-md mt-2 text-sm text-muted-foreground">
            You learn best through listening, discussion, and verbal instruction.
          </TabsContent>
          <TabsContent value="kinesthetic" className="p-4 bg-muted/30 rounded-md mt-2 text-sm text-muted-foreground">
            You learn best through practice, movement, and hands-on activities.
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label htmlFor="studyHoursWeekly">Weekly Study Hours</Label>
        <Select 
          defaultValue=""
          onValueChange={(value) => preferencesForm.setValue("studyHoursWeekly", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select hours" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0-5">Less than 5 hours</SelectItem>
            <SelectItem value="5-10">5-10 hours</SelectItem>
            <SelectItem value="10-20">10-20 hours</SelectItem>
            <SelectItem value="20-30">20-30 hours</SelectItem>
            <SelectItem value="30+">More than 30 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notification Preferences</Label>
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox 
            id="notifications" 
            checked={preferencesForm.watch("notificationsEnabled")}
            onCheckedChange={(checked) => 
              preferencesForm.setValue("notificationsEnabled", checked as boolean)
            }
          />
          <label
            htmlFor="notifications"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable study reminders and notifications
          </label>
        </div>
      </div>

      <div className="flex gap-2 justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep("profile")}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Continue
        </Button>
      </div>
    </form>
  );
  
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="py-4 text-center">
        <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">You're All Set!</h3>
        <p className="text-muted-foreground mt-2">
          Your profile is ready. Start your learning journey with Jadoo 2.0.
        </p>
      </div>
      
      <div className="space-y-3 py-4">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Achievements Unlocked
        </h4>
        
        <div className="space-y-2">
          {achievements.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              title={achievement.title}
              description={achievement.description}
              icon={achievement.icon}
              unlocked={unlockedAchievements.includes(achievement.id)}
            />
          ))}
        </div>
      </div>
      
      <Button
        className="w-full"
        disabled={isLoading}
        onClick={submitRegistration}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Complete Registration
      </Button>
      
      <div className="text-xs text-center text-muted-foreground">
        By registering, you agree to our{" "}
        <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{" "}
        <a href="/policy" className="text-primary hover:underline">Privacy Policy</a>
      </div>
    </div>
  );
  
  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "basic-info":
        return renderBasicInfoStep();
      case "profile":
        return renderProfileStep();
      case "preferences":
        return renderPreferencesStep();
      case "complete":
        return renderCompletionStep();
      default:
        return null;
    }
  };
  
  // Render step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case "basic-info":
        return {
          title: "Create Your Account",
          description: "Start your learning journey with Jadoo",
          icon: <User className="h-5 w-5" />
        };
      case "profile":
        return {
          title: "Your Profile",
          description: "Tell us more about yourself",
          icon: <BookOpen className="h-5 w-5" />
        };
      case "preferences":
        return {
          title: "Learning Preferences",
          description: "Customize your learning experience",
          icon: <Brain className="h-5 w-5" />
        };
      case "complete":
        return {
          title: "Ready to Learn",
          description: "Your personalized study assistant awaits",
          icon: <Trophy className="h-5 w-5" />
        };
      default:
        return {
          title: "Sign Up",
          description: "Create your account",
          icon: null
        };
    }
  };
  
  const stepInfo = getStepInfo();
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Onboarding Character */}
      <OnboardingCharacter 
        currentStep={currentStep} 
        completedSteps={completedSteps} 
        totalSteps={totalSteps} 
      />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 justify-center mb-2">
            {stepInfo.icon && (
              <div className="p-1.5 bg-primary/10 rounded-full">
                {stepInfo.icon}
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-center">
              {stepInfo.title}
            </CardTitle>
          </div>
          <CardDescription className="text-center">
            {stepInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress tracker */}
          <SignupProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
          />
          
          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
      
      {/* Achievement popup */}
      <AnimatePresence>
        {newAchievement && (
          <AchievementPopup
            title={newAchievement.title}
            description={newAchievement.description}
            icon={newAchievement.icon}
            onClose={() => setNewAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}