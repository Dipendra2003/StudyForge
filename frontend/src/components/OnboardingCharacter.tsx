import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignupStep } from "./SignupProgress";
import { Lightbulb, Wand2, Brain, BookOpen, User, Heart } from "lucide-react";

// Import FocusEvent without React namespace to avoid type errors
type GenericEvent = Event;

interface OnboardingCharacterProps {
  currentStep: SignupStep;
  completedSteps: number;
  totalSteps: number;
}

type CharacterMood = "happy" | "thinking" | "excited" | "explaining" | "celebrating";

type FormField = "username" | "email" | "password" | "confirmPassword" | "fullName" | 
                "education" | "bio" | "preferredLanguage" | "learningStyle" | "studyHoursWeekly" | 
                "none";

interface StepConfig {
  mood: CharacterMood;
  message: string;
  icon: React.ReactNode;
  fieldHints: Record<FormField, string>;
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
  const [activeField, setActiveField] = useState<FormField>("none");

  const stepConfigs: Record<SignupStep, StepConfig> = {
    "basic-info": {
      mood: "explaining",
      message: "Let's get started! Type in your username and create a secure password. Make sure to pick something you'll remember!",
      icon: <User className="text-primary h-5 w-5" />,
      fieldHints: {
        username: "Pick a unique username that represents you! It should be at least 3 characters.",
        email: "Enter your email address so we can contact you and help recover your account if needed.",
        password: "Create a strong password with at least 8 characters. Mix letters, numbers, and symbols!",
        confirmPassword: "Type your password again to make sure it's correct.",
        fullName: "",
        education: "",
        bio: "",
        preferredLanguage: "",
        learningStyle: "",
        studyHoursWeekly: "",
        none: "Please fill out the form to create your account!"
      }
    },
    "profile": {
      mood: "thinking",
      message: "Great! Now tell me your full name and education level. This helps me customize your learning materials.",
      icon: <BookOpen className="text-primary h-5 w-5" />,
      fieldHints: {
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "What should I call you? This helps personalize your learning experience.",
        education: "Select your education level so I can adjust the difficulty of your learning materials.",
        bio: "Tell me a bit about yourself and your learning goals (optional).",
        preferredLanguage: "",
        learningStyle: "",
        studyHoursWeekly: "",
        none: "Fill in your profile details to help me personalize your learning experience!"
      }
    },
    "preferences": {
      mood: "excited",
      message: "Almost there! Select your preferred language and learning style. This will make your study sessions more effective.",
      icon: <Brain className="text-primary h-5 w-5" />,
      fieldHints: {
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        education: "",
        bio: "",
        preferredLanguage: "Choose the language you're most comfortable with for the interface and content.",
        learningStyle: "Everyone learns differently! Select the style that works best for you.",
        studyHoursWeekly: "How much time can you dedicate to learning each week?",
        none: "Set your learning preferences to optimize your study sessions!"
      }
    },
    "complete": {
      mood: "celebrating",
      message: "Woohoo! You've completed your profile. Click the button to start your learning adventure with Jadoo 2.0!",
      icon: <Wand2 className="text-primary h-5 w-5" />,
      fieldHints: {
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        education: "",
        bio: "",
        preferredLanguage: "",
        learningStyle: "",
        studyHoursWeekly: "",
        none: "Click the button to complete your registration!"
      }
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
    setActiveField("none");

    // Randomly show tips occasionally
    const tipInterval = setInterval(() => {
      if (Math.random() > 0.7 && activeField === "none") {
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
  }, [currentStep, activeField]);
  
  // Set up event listeners for form field focus
  useEffect(() => {
    const handleFieldFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      let field = target.id as FormField;
      
      // If the field is valid and we have a hint for it, update the character
      if (field && stepConfigs[currentStep].fieldHints[field]) {
        setActiveField(field);
        setSpeechBubble(stepConfigs[currentStep].fieldHints[field]);
        
        // Change character mood based on field type
        if (field === "password" || field === "confirmPassword") {
          setCharacterMood("thinking");
        } else if (field === "learningStyle" || field === "preferredLanguage") {
          setCharacterMood("excited");
        } else {
          setCharacterMood("explaining");
        }
      }
    };
    
    const handleFieldBlur = () => {
      // Reset to default step message when leaving a field
      setTimeout(() => {
        setActiveField("none");
        setSpeechBubble(stepConfigs[currentStep].message);
        setCharacterMood(stepConfigs[currentStep].mood);
      }, 200);
    };
    
    // Instead of adding event listeners directly, use a MutationObserver
    // to detect when forms are rendered and add listeners
    
    // Define a function that will handle adding listeners to inputs
    const addListenersToForm = () => {
      const formInputs = document.querySelectorAll('input, select');
      
      formInputs.forEach(input => {
        // Use proper DOM methods to add/remove event listeners
        (input as HTMLElement).addEventListener('focus', handleFieldFocus);
        (input as HTMLElement).addEventListener('blur', handleFieldBlur);
      });
    };
    
    // Add listeners immediately
    addListenersToForm();
    
    // And also set up a small interval to handle dynamically added fields
    const intervalId = setInterval(addListenersToForm, 1000);
    
    return () => {
      // Clean up interval
      clearInterval(intervalId);
      
      // Remove listeners
      const formInputs = document.querySelectorAll('input, select');
      formInputs.forEach(input => {
        (input as HTMLElement).removeEventListener('focus', handleFieldFocus);
        (input as HTMLElement).removeEventListener('blur', handleFieldBlur);
      });
    };
  }, [currentStep, stepConfigs]);

  // Get arrow position based on current active field
  const getArrowPosition = () => {
    switch (activeField) {
      case "username":
        return "25%";
      case "email":
        return "35%";
      case "password":
        return "45%";
      case "confirmPassword":
        return "55%";
      case "fullName":
        return "25%";
      case "education":
        return "40%";
      case "bio":
        return "55%";
      case "preferredLanguage":
        return "30%";
      case "learningStyle":
        return "45%";
      case "studyHoursWeekly":
        return "60%";
      default:
        return "25%";
    }
  };
  
  // Cartoon boy character based on mood
  const renderCartoonBoy = () => {
    const eyeStyle = isBlinking 
      ? "w-2 h-0.5 bg-gray-800 rounded-full" 
      : "w-2 h-2 bg-gray-800 rounded-full";
    
    // Different face expressions based on mood
    let mouthPath = "";
    let eyebrowPath = "";
    let faceColor = "bg-amber-200";
    let hairColor = "bg-amber-700";
    
    switch (characterMood) {
      case "happy":
        mouthPath = "M8.5 11.5C10 13 14 13 15.5 11.5"; // Happy smile
        eyebrowPath = "M7 7 L9 6 M17 7 L15 6"; // Normal eyebrows
        break;
      case "thinking":
        mouthPath = "M8.5 12 L15.5 12"; // Straight line
        eyebrowPath = "M7 6 L10 7 M17 7 L14 6"; // Thinking eyebrows
        break;
      case "excited":
        mouthPath = "M8.5 11.5C10 14 14 14 15.5 11.5"; // Big smile
        eyebrowPath = "M7 6 L10 5 M17 6 L14 5"; // Raised eyebrows
        break;
      case "explaining":
        mouthPath = "M11 11.5C11 14 13 14 13 11.5"; // O shape
        eyebrowPath = "M7 6 L10 7 M17 7 L14 6"; // Explaining eyebrows
        break;
      case "celebrating":
        mouthPath = "M8.5 11.5C10 14 14 14 15.5 11.5"; // Big smile
        eyebrowPath = "M7 5 L10 6 M17 5 L14 6"; // Very raised eyebrows
        break;
      default:
        mouthPath = "M8.5 11.5C10 13 14 13 15.5 11.5"; // Default smile
        eyebrowPath = "M7 7 L9 6 M17 7 L15 6"; // Default eyebrows
    }
    
    return (
      <div className="relative w-full h-full">
        {/* Animated pointing hand/arrow based on active field */}
        <motion.div 
          className="absolute -right-6 top-1/4 z-20"
          animate={{ 
            x: [0, 15, 0],
            rotate: [0, 15, 0],
            top: getArrowPosition()
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      
        {/* Head/Face */}
        <div className={`absolute inset-0 rounded-full ${faceColor}`}>
          {/* Hair */}
          <div className={`absolute -top-1 left-0 right-0 h-7 ${hairColor} rounded-t-full`}
               style={{ borderBottomLeftRadius: '40%', borderBottomRightRadius: '40%' }}>
          </div>
          
          {/* Eyes */}
          <div className="absolute top-7 left-7 flex space-x-4">
            <div className={eyeStyle}></div>
            <div className={eyeStyle}></div>
          </div>
          
          {/* Eyebrows */}
          <svg className="absolute top-5 left-5" width="14" height="4" viewBox="0 0 14 4">
            <path d={eyebrowPath} stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          
          {/* Mouth */}
          <svg className="absolute top-8 left-5" width="14" height="8" viewBox="0 0 14 8">
            <path d={mouthPath} stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          
          {/* Blush */}
          {(characterMood === "happy" || characterMood === "excited" || characterMood === "celebrating") && (
            <>
              <div className="absolute top-8 left-4 w-2 h-1 bg-red-300 rounded-full opacity-60"></div>
              <div className="absolute top-8 right-4 w-2 h-1 bg-red-300 rounded-full opacity-60"></div>
            </>
          )}
        </div>
      </div>
    );
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

  // State to track if the character is visible on small screens
  const [isVisible, setIsVisible] = useState(true);
  
  // Function to toggle character visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  // Effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Always show on larger screens
      if (window.innerWidth > 768) {
        setIsVisible(true);
      }
    };
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Call once to set initial state
    handleResize();
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Toggle button on small screens */}
      <button 
        onClick={toggleVisibility}
        className={`md:hidden fixed bottom-2 left-2 z-50 bg-primary text-white p-2 rounded-full shadow-md
                   flex items-center justify-center ${isVisible ? 'rotate-180' : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            key="character-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-6 z-40 flex items-end"
          >
            {/* Character */}
            <motion.div
              key="character"
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
                  {renderCartoonBoy()}
                  
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
                key="speech-bubble"
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                className="ml-4 mt-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-md 
                          max-w-xs relative speech-bubble border border-primary/10
                          hidden sm:block" // Hide on smallest screens
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}