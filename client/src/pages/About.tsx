import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function About() {
  const [, setLocation] = useLocation();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const scrollToSection = () => {
    // This is a placeholder since we're not scrolling on this page
    // but keeping the interface consistent with Home
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header onNavigate={scrollToSection} />
      
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">
              About <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Jadoo 2.0</span>
            </h1>
            
            <div className="bg-white rounded-xl shadow-md p-8 mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-700 mb-6">
                StudyForge (Jadoo 2.0) is built with a simple yet powerful mission: to democratize access to personalized education through 
                artificial intelligence. We believe that every student deserves an intelligent study companion that adapts to their 
                unique learning style, making education more accessible, engaging, and effective. Our platform combines cutting-edge AI 
                technology with proven learning methodologies to create a comprehensive study ecosystem that helps students achieve their 
                academic goals faster and more efficiently.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">What is StudyForge?</h2>
              <p className="text-gray-700 mb-4">
                StudyForge is an AI-powered study platform that revolutionizes the way students learn and retain information. Built with 
                modern web technologies and powered by Google Gemini AI, our platform offers:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
                <li><strong>Smart Flashcard Generation:</strong> Automatically create flashcards from your documents, notes, or any text content</li>
                <li><strong>Adaptive Quiz System:</strong> Take quizzes that adjust difficulty based on your performance in real-time</li>
                <li><strong>AI Chat Assistant:</strong> Get instant help with your study questions, explanations, and concept clarifications</li>
                <li><strong>Document Summarization:</strong> Upload PDFs or Word documents and get concise, intelligent summaries</li>
                <li><strong>Study Planner:</strong> Organize your learning with personalized study schedules and task management</li>
                <li><strong>Progress Analytics:</strong> Track your learning journey with detailed insights and performance metrics</li>
                <li><strong>Spaced Repetition:</strong> Optimize retention with scientifically-proven review intervals</li>
                <li><strong>Code Generation:</strong> Get help with programming assignments and code explanations</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mb-4">The Story Behind Jadoo</h2>
              <p className="text-gray-700 mb-6">
                The name "Jadoo" means "magic" in Hindi, and that's exactly what we aim to bring to the learning experience. 
                This project was born from the firsthand experience of struggling with traditional study methods and wishing for a 
                smarter, more personalized way to learn. StudyForge was created to be the magical study assistant that transforms 
                the way students approach their education—making learning not just effective, but enjoyable.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Our Technology Stack</h2>
              <p className="text-gray-700 mb-4">
                StudyForge is built with cutting-edge technologies to ensure a fast, reliable, and scalable learning experience:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Frontend</h4>
                  <p className="text-sm text-gray-600">React 18, TypeScript, Tailwind CSS, Framer Motion, TanStack Query</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Backend</h4>
                  <p className="text-sm text-gray-600">Node.js, Express, TypeScript, Drizzle ORM</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Database</h4>
                  <p className="text-sm text-gray-600">MySQL with optimized queries and indexing</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">AI & ML</h4>
                  <p className="text-sm text-gray-600">Google Gemini AI, Natural Language Processing</p>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">AI-Powered Content Generation</h4>
                    <p className="text-sm text-gray-600">Generate flashcards, quizzes, and summaries from any content using advanced AI</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Adaptive Learning</h4>
                    <p className="text-sm text-gray-600">Quiz difficulty adjusts in real-time based on your performance</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Progress Tracking</h4>
                    <p className="text-sm text-gray-600">Detailed analytics with heatmaps, mastery charts, and performance insights</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Multi-Format Support</h4>
                    <p className="text-sm text-gray-600">Upload PDFs, Word documents, or paste text directly</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">5</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Voice & Accessibility</h4>
                    <p className="text-sm text-gray-600">Text-to-speech, voice control, and keyboard shortcuts for enhanced accessibility</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">6</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Export & Share</h4>
                    <p className="text-sm text-gray-600">Export flashcards as PDF/DOCX and share quizzes with friends</p>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-primary mb-2">Accessibility</h3>
                  <p className="text-gray-600">
                    We believe that quality education should be accessible to everyone, regardless of background or circumstances.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-primary mb-2">Innovation</h3>
                  <p className="text-gray-600">
                    We continuously push the boundaries of what's possible with AI-powered education tools.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-primary mb-2">Empowerment</h3>
                  <p className="text-gray-600">
                    We aim to empower students to take control of their learning journey and achieve their academic goals.
                  </p>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">About the Creator</h2>
              <div className="bg-gradient-to-r from-primary/5 to-emerald-500/5 p-6 rounded-lg mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      DK
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-2xl font-bold mb-2">Dipendra Kumar</h3>
                    <p className="text-gray-700 mb-3">
                      Full-Stack Developer & Creator of StudyForge
                    </p>
                    <p className="text-gray-600 mb-4">
                      Dipendra Kumar is a passionate software engineer and the creator of StudyForge. With a strong background in 
                      full-stack development and a deep interest in artificial intelligence, Dipendra built this platform to solve 
                      real-world learning challenges faced by students. His expertise spans across modern web technologies including 
                      React, TypeScript, Node.js, and AI integration. Through StudyForge, he aims to make quality education accessible 
                      to students worldwide by leveraging the power of AI and innovative learning methodologies.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a 
                        href="https://github.com/Dipendra2003" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                      >
                        <i className="fab fa-github mr-2"></i> GitHub
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/dipendra-kumar-b077b9286/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <i className="fab fa-linkedin mr-2"></i> LinkedIn
                      </a>
                      <a 
                        href="https://portfolio-dipendra.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                      >
                        <i className="fas fa-globe mr-2"></i> Portfolio
                      </a>
                      <a 
                        href="mailto:dipendrak299@gmail.com"
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors"
                      >
                        <i className="fas fa-envelope mr-2"></i> Email
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Open Source & Community</h2>
              <p className="text-gray-700 mb-4">
                StudyForge is committed to transparency and community collaboration. The project is open source and available on GitHub, 
                welcoming contributions from developers worldwide. We believe in building in public and sharing knowledge with the community.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <a 
                  href="https://github.com/Dipendra2003/StudyForge" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <i className="fab fa-github mr-2"></i> View on GitHub
                </a>
                <a 
                  href="https://github.com/Dipendra2003/StudyForge/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition-colors"
                >
                  <i className="fas fa-bug mr-2"></i> Report Issues
                </a>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                <Button onClick={() => setLocation("/")} variant="outline" className="rounded-full">
                  Back to Home
                </Button>
                <Button onClick={() => setLocation("/register")} className="rounded-full bg-primary hover:bg-primary/90">
                  Get Started for Free
                </Button>
              </div>
            </div>
            
            <div className="text-center mt-12 mb-8">
              <h2 className="text-3xl font-bold mb-6">Join Our Community</h2>
              <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                Connect with other students and educators using Jadoo 2.0 to share study tips, resources, and success stories.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" className="rounded-full">
                  <i className="fab fa-discord mr-2"></i> Join Discord
                </Button>
                <Button variant="outline" className="rounded-full">
                  <i className="fab fa-twitter mr-2"></i> Follow Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}