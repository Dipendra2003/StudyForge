import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Sample testimonials data
const testimonials = [
  {
    id: 1,
    name: "Maya S.",
    role: "Computer Science Student",
    content: "Jadoo 2.0 helped me understand complex algorithms when I was struggling. The code generation feature is a game-changer for programming assignments!",
    avatar: "M" // First letter of name for avatar
  },
  {
    id: 2,
    name: "James T.",
    role: "Medical Student",
    content: "I use Jadoo's document summarization daily for my medical texts. It saves me hours of reading while highlighting the most important concepts.",
    avatar: "J"
  },
  {
    id: 3,
    name: "Priya K.",
    role: "High School Student",
    content: "The MCQ generator and flashcards helped me ace my exams. I love how it adapts to my learning style and focuses on areas where I need more practice.",
    avatar: "P"
  },
  {
    id: 4,
    name: "David L.",
    role: "Engineering Graduate",
    content: "The study planner feature is incredible. It helped me organize my preparation for my final exams and maintain a consistent study schedule.",
    avatar: "D"
  },
  {
    id: 5,
    name: "Sofia R.",
    role: "Language Arts Teacher",
    content: "I recommend Jadoo 2.0 to all my students. It's like having a personal tutor available 24/7 that can help with any subject.",
    avatar: "S"
  }
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        nextTestimonial();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [currentIndex, isPaused]);

  const nextTestimonial = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      };
    }
  };

  // Calculate visible testimonials (current one and two on either side for desktop)
  const visibleTestimonials = [
    testimonials[currentIndex],
    testimonials[(currentIndex + 1) % testimonials.length],
    testimonials[(currentIndex + 2) % testimonials.length]
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-white to-gray-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">
          What Our <span className="text-primary">Users</span> Say
        </h2>
        
        <div 
          className="relative max-w-6xl mx-auto" 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="hidden md:flex justify-center gap-6">
            {visibleTestimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.id} 
                className={`w-full max-w-md transition-all duration-300 ${index === 0 ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                      <p className="text-gray-500 text-sm mb-3">{testimonial.role}</p>
                      <p className="text-gray-700">{testimonial.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Mobile view - single testimonial with animation */}
          <div className="md:hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="w-full"
              >
                <Card className="w-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">
                        {testimonials[currentIndex].avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{testimonials[currentIndex].name}</h3>
                        <p className="text-gray-500 text-sm mb-3">{testimonials[currentIndex].role}</p>
                        <p className="text-gray-700">{testimonials[currentIndex].content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <button 
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Previous testimonial"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    currentIndex === index ? "w-6 bg-primary" : "w-2 bg-gray-300"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Next testimonial"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}