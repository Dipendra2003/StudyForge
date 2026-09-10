import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Benefits from "@/components/Benefits";
import CallToAction from "@/components/CallToAction";
import FAQSection from "@/components/FAQSection";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import Footer from "@/components/Footer";
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
