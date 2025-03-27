import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, BookOpen, Brain, Code, CalendarCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  
  // Check if this is the user's first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('jadoo_welcomed');
    
    if (!hasVisited) {
      // Wait a moment before showing the modal
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('jadoo_welcomed', 'true');
  };
  
  const features = [
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: "AI-Powered Q&A",
      description: "Ask any study question and get instant answers across multiple subjects."
    },
    {
      icon: <FileText className="h-6 w-6 text-emerald-500" />,
      title: "Document Summarization",
      description: "Upload study materials and get concise summaries and explanations."
    },
    {
      icon: <Brain className="h-6 w-6 text-amber-500" />,
      title: "Flashcards & MCQs",
      description: "Generate study cards and quizzes to test your knowledge."
    },
    {
      icon: <Code className="h-6 w-6 text-blue-500" />,
      title: "Code Generation",
      description: "Get help with programming problems across various languages."
    },
    {
      icon: <CalendarCheck className="h-6 w-6 text-violet-500" />,
      title: "Study Planning",
      description: "Create personalized study schedules based on your goals."
    }
  ];
  
  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.9 
    },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: { 
        type: "spring",
        damping: 25,
        stiffness: 500
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.9,
      transition: { 
        duration: 0.2
      }
    }
  };
  
  const slideVariants = {
    hidden: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 500
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -500 : 500,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    })
  };
  
  const [slideDirection, setSlideDirection] = useState(1);
  
  const nextStep = () => {
    setSlideDirection(1);
    setStep(prev => {
      if (prev === features.length - 1) {
        handleClose();
        return prev;
      }
      return prev + 1;
    });
  };
  
  const prevStep = () => {
    setSlideDirection(-1);
    setStep(prev => (prev > 0 ? prev - 1 : prev));
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="p-6 pt-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">
                  Welcome to <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Jadoo 2.0</span>
                </h2>
                <p className="text-gray-600 mt-2">Your AI-powered study assistant</p>
              </div>
              
              <AnimatePresence custom={slideDirection} initial={false}>
                <motion.div
                  key={step}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="min-h-[200px] flex flex-col items-center justify-center px-4"
                >
                  <div className="p-3 rounded-full bg-gray-100 mb-4">
                    {features[step].icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{features[step].title}</h3>
                  <p className="text-gray-600 text-center">{features[step].description}</p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-1">
                  {features.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === step ? "w-6 bg-primary" : "w-1.5 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" onClick={prevStep}>
                      Back
                    </Button>
                  )}
                  <Button onClick={nextStep}>
                    {step === features.length - 1 ? "Get Started" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}