import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const testimonials = [
    {
      name: "Sophia Chen",
      role: "Computer Science Student",
      message: "Jadoo 2.0 transformed how I study programming. The code generation feature helped me understand complex algorithms I was struggling with. I improved my grades dramatically this semester!",
      rating: 5,
      image: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Marcus Johnson",
      role: "Medical Student",
      message: "Studying for medical exams became so much easier with Jadoo. The flashcard feature and personalized quizzes helped me memorize complex terminology. This tool is a lifesaver!",
      rating: 5,
      image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Aisha Patel",
      role: "Physics Major",
      message: "I was struggling with quantum mechanics concepts until I started using Jadoo 2.0. The way it explains complex topics in simple language and generates relevant practice problems is amazing.",
      rating: 4,
      image: "https://randomuser.me/api/portraits/women/65.jpg"
    },
    {
      name: "David Wilson",
      role: "Law Student",
      message: "The document summarization feature has been invaluable for condensing lengthy case studies and legal documents. Jadoo 2.0 helped me prepare for my bar exam more efficiently.",
      rating: 5,
      image: "https://randomuser.me/api/portraits/men/22.jpg"
    },
    {
      name: "Emma Rodriguez",
      role: "High School Student",
      message: "As a student with dyslexia, I struggled with traditional studying methods. Jadoo's voice interaction and summarization tools have made learning accessible and enjoyable for me.",
      rating: 5,
      image: "https://randomuser.me/api/portraits/women/90.jpg"
    }
  ];

  const nextTestimonial = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoplay) {
      interval = setInterval(() => {
        nextTestimonial();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentIndex, autoplay]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute top-10 left-10 text-primary/10 opacity-50">
        <Quote size={120} strokeWidth={1} />
      </div>
      <div className="absolute bottom-10 right-10 text-primary/10 opacity-50 transform rotate-180">
        <Quote size={120} strokeWidth={1} />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Our Users Say</h2>
        
        <div 
          className="relative overflow-hidden py-6"
          onMouseEnter={() => setAutoplay(false)}
          onMouseLeave={() => setAutoplay(true)}
        >
          <AnimatePresence mode="wait" custom={direction}>
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
              className="bg-card border rounded-2xl shadow-lg p-6 md:p-8 lg:p-10 flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="flex-shrink-0">
                <div className="h-28 w-28 md:h-32 md:w-32 lg:h-40 lg:w-40 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl">
                  <img 
                    src={testimonials[currentIndex].image} 
                    alt={testimonials[currentIndex].name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="flex gap-1 mb-2">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="fill-yellow-400 text-yellow-400" size={20} />
                  ))}
                  {[...Array(5 - testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i + testimonials[currentIndex].rating} className="text-gray-300" size={20} />
                  ))}
                </div>
                
                <p className="text-lg md:text-xl italic mb-6">"{testimonials[currentIndex].message}"</p>
                
                <div>
                  <h3 className="font-bold text-lg md:text-xl">{testimonials[currentIndex].name}</h3>
                  <p className="text-muted-foreground">{testimonials[currentIndex].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center gap-2 mt-8">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full" 
              onClick={prevTestimonial}
            >
              <ArrowLeft size={18} />
            </Button>
            
            {testimonials.map((_, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className={`w-3 h-3 rounded-full p-0 min-w-0 ${
                  currentIndex === index 
                    ? "bg-primary" 
                    : "bg-primary/20"
                }`}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
              />
            ))}
            
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full" 
              onClick={nextTestimonial}
            >
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}