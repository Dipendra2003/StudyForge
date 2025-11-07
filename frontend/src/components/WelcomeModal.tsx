import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Link } from 'wouter';

interface WelcomeModalProps {
  onClose: () => void;
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Jadoo 2.0",
      description: "Your AI-powered study assistant that helps you learn smarter, not harder.",
      icon: "🚀"
    },
    {
      title: "Smart Q&A",
      description: "Ask questions in natural language and get accurate, cited answers across multiple subjects.",
      icon: "💬"
    },
    {
      title: "Document Summarization",
      description: "Upload your study materials and get concise summaries, key points, and flashcards.",
      icon: "📄"
    },
    {
      title: "Interactive Quizzes",
      description: "Test your knowledge with AI-generated quizzes adapted to your learning level.",
      icon: "🧠"
    },
    {
      title: "Code Generation",
      description: "Get coding help with explanations for programming assignments and problems.",
      icon: "💻"
    }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSkip = () => {
    onClose();
  };
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card max-w-[340px] sm:max-w-md w-full rounded-xl shadow-xl overflow-hidden relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.3 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2 z-10"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
          
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="mb-3 sm:mb-4 text-3xl sm:text-4xl">{steps[currentStep].icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{steps[currentStep].title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">{steps[currentStep].description}</p>
              </motion.div>
            </AnimatePresence>
            
            <div className="flex justify-center mb-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full mx-1 transition-all duration-300 ${
                    index === currentStep
                      ? "w-6 bg-primary"
                      : "w-2 bg-primary/30"
                  }`}
                />
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              {currentStep > 0 ? (
                <Button variant="ghost" onClick={handlePrevious}>
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Link href="/register">
                  <Button onClick={onClose}>Get Started</Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}