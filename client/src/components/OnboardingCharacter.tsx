import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignupStep } from "./SignupProgress";
import { Lightbulb, Wand2, Brain, BookOpen, User, Heart } from "lucide-react";

interface OnboardingCharacterProps {
  currentStep: SignupStep;
  completedSteps: number;
  totalSteps: number;
}

type CharacterMood = "happy" | "thinking" | "excited" | "explaining" | "celebrating";

interface StepConfig {
  mood: CharacterMood;
  message: string;
  icon: React.ReactNode;
}

export default function OnboardingCharacter({
  currentStep,
  completedSteps,
  totalSteps,
}: OnboardingCharacterProps) {
  const [characterMood, setCharacterMood] = useState<CharacterMood>("happy");
  const [speechBubble, setSpeechBubble] = useState<string>("");
  const [displayedIcon, setDisplayedIcon] = useState<React.ReactNode>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  const stepConfigs: Record<SignupStep, StepConfig> = {
    "basic-info": {
      mood: "explaining",
      message: "Let's get started! Create your account with a unique username and secure password.",
      icon: <User className="text-primary h-5 w-5" />,
    },
    "profile": {
      mood: "thinking",
      message: "Tell me more about yourself so I can personalize your learning experience!",
      icon: <BookOpen className="text-primary h-5 w-5" />,
    },
    "preferences": {
      mood: "excited",
      message: "Almost done! Let's customize your study preferences to optimize your learning.",
      icon: <Brain className="text-primary h-5 w-5" />,
    },
    "complete": {
      mood: "celebrating",
      message: "Congratulations! You're all set to start your learning journey with Jadoo 2.0!",
      icon: <Wand2 className="text-primary h-5 w-5" />,
    },
  };

  // Random tips to display occasionally
  const randomTips = [
    "You can change your preferences later in the settings!",
    "Jadoo works best when you use it regularly!",
    "Try using voice commands for a hands-free experience!",
    "You can generate flashcards automatically from your notes!",
    "Dark mode can reduce eye strain during night study sessions!",
  ];

  // Update character mood and speech based on current step
  useEffect(() => {
    const config = stepConfigs[currentStep];
    setCharacterMood(config.mood);
    setSpeechBubble(config.message);
    setDisplayedIcon(config.icon);

    // Randomly show tips occasionally
    const tipInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const randomTip = randomTips[Math.floor(Math.random() * randomTips.length)];
        setSpeechBubble(`💡 Tip: ${randomTip}`);
        setDisplayedIcon(<Lightbulb className="text-amber-500 h-5 w-5" />);
        
        // Reset back to step message after showing tip
        setTimeout(() => {
          setSpeechBubble(config.message);
          setDisplayedIcon(config.icon);
        }, 5000);
      }
    }, 15000);

    // Blink animation
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 5000);

    return () => {
      clearInterval(tipInterval);
      clearInterval(blinkInterval);
    };
  }, [currentStep]);

  // Character expressions based on mood
  const renderCharacterFace = () => {
    const baseStyle = "rounded-full w-8 h-8 flex items-center justify-center";
    
    switch (characterMood) {
      case "happy":
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-blue-100`}>
              <span className="text-lg">😊</span>
            </div>
          </div>
        );
      case "thinking":
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-purple-100`}>
              <span className="text-lg">🤔</span>
            </div>
          </div>
        );
      case "excited":
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-green-100`}>
              <span className="text-lg">😃</span>
            </div>
          </div>
        );
      case "explaining":
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-amber-100`}>
              <span className="text-lg">🧠</span>
            </div>
          </div>
        );
      case "celebrating":
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-pink-100`}>
              <span className="text-lg">🎉</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <div className={`${baseStyle} bg-blue-100`}>
              <span className="text-lg">😊</span>
            </div>
          </div>
        );
    }
  };

  // Motion variants for the character
  const characterVariants = {
    idle: {
      y: [0, -5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
    excited: {
      rotate: [-2, 2, -2],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
    thinking: {
      rotate: [0, 2, 0, -2, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
    celebrating: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  };

  // Determine which animation to use based on mood
  const getCharacterAnimation = () => {
    switch (characterMood) {
      case "excited":
      case "explaining":
        return "excited";
      case "thinking":
        return "thinking";
      case "celebrating":
        return "celebrating";
      default:
        return "idle";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 left-6 z-50 flex items-end">
        {/* Character */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            ...characterVariants[getCharacterAnimation()]
          }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 relative">
            {/* Character head/body */}
            <motion.div 
              className={`absolute inset-0 bg-gradient-to-br from-primary/80 to-primary rounded-full 
                         shadow-lg flex items-center justify-center p-1
                         border-2 ${isBlinking ? 'border-white/60' : 'border-white/20'}`}
              animate={getCharacterAnimation()}
              variants={characterVariants}
            >
              {renderCharacterFace()}
              
              {/* Progress indicator around character */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="48" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth="3" 
                />
                <circle 
                  cx="50" cy="50" r="48" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="3" 
                  strokeDasharray={`${(completedSteps / totalSteps) * 301} 301`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </motion.div>
          </div>
          
          {/* Speech bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            className="ml-4 mt-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-md 
                       max-w-xs relative speech-bubble border border-primary/10"
            style={{ minWidth: "220px" }}
          >
            <div className="flex items-center gap-2 mb-1">
              {displayedIcon}
              <span className="text-xs font-medium text-primary">Jadoo Assistant</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{speechBubble}</p>
            
            {/* Small indicator at bottom of speech bubble */}
            <div className="absolute left-5 bottom-0 w-4 h-4 bg-white dark:bg-gray-800 
                            transform rotate-45 border-b border-r border-primary/10 
                            translate-y-2"></div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}