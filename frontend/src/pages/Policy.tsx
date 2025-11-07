import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Policy() {
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
              Privacy Policy
            </h1>
            
            <div className="bg-white rounded-xl shadow-md p-8 mb-12">
              <p className="text-gray-600 mb-8">
                Last Updated: March 27, 2025
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="text-gray-700 mb-6">
                At Jadoo 2.0, we take your privacy very seriously. This Privacy Policy explains how we collect, use, 
                store, and protect your personal information when you use our AI-powered study assistant. We're committed 
                to transparency and ensuring you understand how your data is handled.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-6">
                We collect the following types of information to provide and improve our services:
              </p>
              <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
                <li>
                  <span className="font-medium">Account Information:</span> When you register, we collect basic details like your name, email address, and password.
                </li>
                <li>
                  <span className="font-medium">Study Content:</span> Documents you upload, questions you ask, and study materials you create using our platform.
                </li>
                <li>
                  <span className="font-medium">Learning Data:</span> Information about how you interact with the platform, including features used, time spent, and progress made.
                </li>
                <li>
                  <span className="font-medium">Technical Information:</span> Device information, IP address, browser type, and cookies to optimize your experience.
                </li>
              </ul>
              
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-6">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
                <li>Providing and personalizing your learning experience</li>
                <li>Improving our AI algorithms to better assist with your learning needs</li>
                <li>Sending important updates about our service</li>
                <li>Technical support and troubleshooting</li>
                <li>Analyzing usage patterns to enhance our platform</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-gray-700 mb-6">
                We implement robust security measures to protect your data, including:
              </p>
              <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
                <li>Encryption of sensitive information</li>
                <li>Regular security audits and testing</li>
                <li>Strict access controls for our staff</li>
                <li>Continuous monitoring for potential vulnerabilities</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-6">
                We retain your account information as long as your account is active. Study content and learning data 
                are retained to provide our service and improve our AI capabilities. You can request deletion of your data 
                at any time by contacting our support team.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-6">
                Depending on your location, you may have rights regarding your personal data, including:
              </p>
              <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
                <li>Accessing your data</li>
                <li>Correcting inaccurate information</li>
                <li>Deleting your data</li>
                <li>Restricting or objecting to processing</li>
                <li>Data portability</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mb-4">Policy Updates</h2>
              <p className="text-gray-700 mb-6">
                We may update this Privacy Policy periodically to reflect changes in our practices or for legal, 
                operational, or regulatory reasons. We will notify you of any significant changes via email or 
                through our platform.
              </p>
              
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-6">
                If you have any questions or concerns about our Privacy Policy or data practices, please contact us at:
                <br />
                <a href="mailto:privacy@jadoo.ai" className="text-primary hover:underline">privacy@jadoo.ai</a>
              </p>
              
              <div className="flex justify-center mt-8">
                <Button onClick={() => setLocation("/")} variant="outline" className="rounded-full">
                  Back to Home
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