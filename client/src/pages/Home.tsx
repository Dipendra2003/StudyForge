import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Benefits from "@/components/Benefits";
import CallToAction from "@/components/CallToAction";
import FAQSection from "@/components/FAQSection";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData, { HOME_PAGE_STRUCTURED_DATA } from "@/components/StructuredData";
import { useRef } from "react";

export default function Home() {
  const featuresRef = useRef<HTMLElement>(null);
  const benefitsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  
  const scrollToSection = (section: string) => {
    const refs: Record<string, React.RefObject<HTMLElement>> = {
      features: featuresRef,
      benefits: benefitsRef,
      faq: faqRef
    };
    
    const ref = refs[section];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full">
      <SEOHead
        title="Jadoo 2.0 (StudyForge) — #1 Free AI Study Assistant, Flashcards & Quiz Maker"
        description="Ace your exams with Jadoo 2.0 (StudyForge) — the free AI study assistant. Generate smart flashcards from PDFs, create adaptive quizzes, summarize notes, and study smarter with Gemini AI."
        keywords="AI study assistant, AI flashcard generator, AI quiz maker, AI document summarizer, study planner app, AI chat for students, code generator for students, best study app 2026, online study tool, AI learning platform, smart flashcards, spaced repetition app, Quizlet alternative free, Anki alternative AI, Chegg alternative free, active recall app, make flashcards from PDF, generate MCQs from text, college study app, NEET preparation AI, JEE study assistant, CBSE study app"
        path="/"
      />
      <StructuredData data={HOME_PAGE_STRUCTURED_DATA} />
      <Header onNavigate={scrollToSection} />
      
      <main className="flex-grow">
        <Hero onScrollToFeatures={() => scrollToSection('features')} />
        
        <section ref={featuresRef} id="features">
          <Features />
        </section>
        
        <section ref={benefitsRef} id="benefits">
          <Benefits />
        </section>
        
        <TestimonialCarousel />
        
        <section ref={faqRef} id="faq">
          <FAQSection />
        </section>
        
        <CallToAction onScrollToWaitlist={() => window.location.href = '/register'} />
      </main>
      
      <Footer />
    </div>
  );
}

