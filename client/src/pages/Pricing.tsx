import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Pricing() {
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header onNavigate={scrollToSection} />
      
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Start with our free plan and upgrade when you need more features.
                No hidden fees, no commitments.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription>Perfect for getting started</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹0</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">/ month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>AI Q&A with 20 questions per day</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Document summarization (up to 3 pages)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Basic flashcard creation (up to 50 cards)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>10 MCQs per document</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Basic code generation (5 per day)</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setLocation("/register")} 
                    className="w-full rounded-full bg-primary hover:bg-primary/90"
                  >
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Plus Plan */}
              <Card className="border-2 border-primary relative shadow-md dark:bg-gray-800">
                <Badge className="absolute -top-3 right-8 bg-primary hover:bg-primary/90">
                  Most Popular
                </Badge>
                <CardHeader>
                  <CardTitle className="text-2xl">Plus</CardTitle>
                  <CardDescription>For serious students</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹99</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">/ month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Unlimited</strong> AI Q&A questions</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Document summarization (up to 20 pages)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Advanced flashcard creation (unlimited)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>30 MCQs per document with difficulty levels</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Advanced code generation (30 per day)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Voice interaction</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setLocation("/register")} 
                    className="w-full rounded-full bg-primary hover:bg-primary/90"
                  >
                    Start 7-Day Free Trial
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Pro Plan */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <CardDescription>For educational institutions</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹199</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">/ month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Everything in Plus</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Document summarization (unlimited pages)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Advanced analytics and progress tracking</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Custom study plans with spaced repetition</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Unlimited code generation with explanations</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Team collaboration features</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>24/7 priority support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setLocation("/register")} 
                    className="w-full rounded-full bg-gray-900 hover:bg-gray-800"
                  >
                    Contact Sales
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-semibold mb-6 text-center">Frequently Asked Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Can I switch between plans?</h3>
                  <p className="text-gray-600 dark:text-gray-400">Yes, you can upgrade or downgrade your plan at any time. Changes will be applied to your next billing cycle.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Is there a student discount?</h3>
                  <p className="text-gray-600 dark:text-gray-400">Yes! Students with a valid .edu email can get 20% off the Plus plan. Contact our support team to apply the discount.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">What happens after my free trial ends?</h3>
                  <p className="text-gray-600 dark:text-gray-400">After your 7-day free trial of the Plus plan, you'll be automatically switched to the Free plan unless you choose to continue with a paid plan.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Can I share my account with others?</h3>
                  <p className="text-gray-600 dark:text-gray-400">Individual accounts are for personal use only. For team or classroom usage, please check our Pro plan with collaboration features.</p>
                </div>
              </div>
              
              <div className="mt-8 text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">Need a custom solution?</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">We offer custom plans for educational institutions and organizations with specific requirements.</p>
                <Button variant="outline" className="rounded-full">
                  Contact Our Education Team
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
