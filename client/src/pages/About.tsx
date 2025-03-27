import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();
  
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
                Jadoo 2.0 is built with a simple yet powerful mission: to democratize access to personalized education through 
                artificial intelligence. We believe that every student deserves an intelligent study companion that adapts to their 
                unique learning style, making education more accessible, engaging, and effective.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">The Story Behind Jadoo</h2>
              <p className="text-gray-700 mb-6">
                The name "Jadoo" means "magic" in Hindi, and that's exactly what we aim to bring to the learning experience. 
                Founded by a team of educators, AI researchers, and students who experienced firsthand the challenges of modern 
                education, Jadoo 2.0 was created to be the magical study assistant that we all wished we had during our academic journeys.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Our Technology</h2>
              <p className="text-gray-700 mb-6">
                Powered by state-of-the-art AI technologies, Jadoo 2.0 combines natural language processing, machine learning, 
                and education science to create a truly adaptive learning companion. Our system continuously learns from 
                interactions with students, becoming more personalized and effective over time.
              </p>
              
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
              
              <h2 className="text-2xl font-semibold mb-4">Open Education Initiative</h2>
              <p className="text-gray-700 mb-8">
                As part of our commitment to making education accessible, Jadoo 2.0 offers a free plan that includes core 
                features to support students in their learning journey. We believe that financial constraints should not limit 
                access to quality educational resources.
              </p>
              
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