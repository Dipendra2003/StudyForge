import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Code,
  FileText,
  Calendar,
  Mail,
  ExternalLink,
  Search,
  Lightbulb,
  Video,
  FileQuestion,
  LayoutDashboard,
  User,
  CreditCard,
} from "lucide-react";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFaqs, setFilteredFaqs] = useState<typeof faqs>(faqs);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToSection = () => {
    // Placeholder function for Header
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredFaqs(faqs);
      return;
    }
    
    const filtered = faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query.toLowerCase()) ||
        faq.answer.toLowerCase().includes(query.toLowerCase()) ||
        faq.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredFaqs(filtered);
  };

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "AI Chat Assistant",
      description: "Get instant help with your studies. Ask questions and receive detailed explanations on any topic.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Document Summarization",
      description: "Upload study materials and get AI-powered summaries with key points and insights.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Flashcards",
      description: "Create and review flashcards with spaced repetition for effective learning.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: <FileQuestion className="h-6 w-6" />,
      title: "Quiz Mode",
      description: "Test your knowledge with AI-generated quizzes and track your progress.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Code Generator",
      description: "Generate code snippets and get programming help in multiple languages.",
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Study Planner",
      description: "Organize your study schedule and track your learning goals.",
      gradient: "from-pink-500 to-rose-500",
    },
  ];

  const resources = [
    {
      title: "Dashboard",
      description: "Access your personalized dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      link: "/dashboard",
    },
    {
      title: "AI Chat Assistant",
      description: "Get instant help with your studies",
      icon: <MessageSquare className="h-5 w-5" />,
      link: "/chat",
    },
    {
      title: "Document Summarization",
      description: "Upload and summarize documents",
      icon: <FileText className="h-5 w-5" />,
      link: "/document-summarization",
    },
    {
      title: "Flashcards",
      description: "Create and review flashcards",
      icon: <BookOpen className="h-5 w-5" />,
      link: "/flashcards",
    },
    {
      title: "Quiz Mode",
      description: "Test your knowledge with quizzes",
      icon: <FileQuestion className="h-5 w-5" />,
      link: "/quiz-mode",
    },
    {
      title: "Code Generator",
      description: "Generate code snippets",
      icon: <Code className="h-5 w-5" />,
      link: "/code-generator",
    },
    {
      title: "Study Planner",
      description: "Organize your study schedule",
      icon: <Calendar className="h-5 w-5" />,
      link: "/study-planner",
    },
    {
      title: "Profile Settings",
      description: "Manage your account settings",
      icon: <User className="h-5 w-5" />,
      link: "/profile",
    },
    {
      title: "Pricing Plans",
      description: "View and upgrade your plan",
      icon: <CreditCard className="h-5 w-5" />,
      link: "/pricing",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header onNavigate={scrollToSection} />
      
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            Help Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Find answers to common questions and learn how to use Jadoo effectively
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Features Overview</CardTitle>
              <CardDescription>Explore what Jadoo can do for you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-300"
                  >
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.gradient} text-white mb-3`}>
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                {searchQuery ? `Found ${filteredFaqs.length} result(s)` : "Common questions and answers"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try searching with different keywords</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary" className="mt-1">
                            {faq.category}
                          </Badge>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pl-20">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Access important features and pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.link}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-300 group hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        {resource.icon}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Still Need Help?
              </CardTitle>
              <CardDescription>Contact our support team for personalized assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Can't find what you're looking for? Our support team is here to help you with any questions or issues.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="/contact" className="flex-1">
                    <Button className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Contact Support
                    </Button>
                  </a>
                  <a href="/chat" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      AI Chat Assistant
                    </Button>
                  </a>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Response Time:</strong> Usually within 24 hours
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Quick Links:</strong>{" "}
                    <a href="/about" className="text-primary hover:underline">About Us</a>
                    {" • "}
                    <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
                    {" • "}
                    <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// FAQ Data
const faqs = [
  {
    category: "General",
    question: "What is Jadoo?",
    answer: "Jadoo is an AI-powered study assistant that helps students learn more effectively. It offers features like AI chat, document summarization, flashcards, quizzes, code generation, and study planning.",
  },
  {
    category: "General",
    question: "How do I get started?",
    answer: "After creating an account, you can start using any of our features immediately. We recommend starting with the AI Chat Assistant to ask questions or uploading a document to get a summary.",
  },
  {
    category: "Account",
    question: "How do I verify my email?",
    answer: "After registration, check your email inbox for a verification link. Click the link or enter the OTP code provided in the email. You can also resend the verification email from your dashboard or settings page.",
  },
  {
    category: "Account",
    question: "How do I change my password?",
    answer: "Go to your Profile page and scroll down to the 'Change Password' section. Enter your current password and your new password, then click 'Change Password'.",
  },
  {
    category: "Features",
    question: "How does the AI Chat Assistant work?",
    answer: "The AI Chat Assistant uses advanced language models to answer your questions. Simply type your question and the AI will provide detailed explanations, examples, and guidance on any topic.",
  },
  {
    category: "Features",
    question: "What file formats can I upload for document summarization?",
    answer: "Currently, you can upload PDF, TXT, DOC, and DOCX files. The AI will analyze the content and provide a comprehensive summary with key points.",
  },
  {
    category: "Features",
    question: "How do flashcards work?",
    answer: "You can create flashcards manually or generate them with AI. The system uses spaced repetition to help you review cards at optimal intervals for better retention.",
  },
  {
    category: "Features",
    question: "Can I generate code in different programming languages?",
    answer: "Yes! The Code Generator supports multiple languages including Python, JavaScript, Java, C++, TypeScript, Go, Rust, and more. Just describe what you need and select your preferred language.",
  },
  {
    category: "Study Tips",
    question: "How can I track my progress?",
    answer: "Your dashboard shows statistics including study time, quizzes completed, flashcards created, and your current streak. You can also view detailed stats on your Profile page.",
  },
  {
    category: "Study Tips",
    question: "What is the study streak feature?",
    answer: "The study streak tracks consecutive days you've used Jadoo. Maintaining a streak helps build consistent study habits and keeps you motivated.",
  },
  {
    category: "Technical",
    question: "Is my data secure?",
    answer: "Yes, we take security seriously. All data is encrypted, passwords are hashed, and we follow industry best practices to protect your information.",
  },
  {
    category: "Technical",
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account from the Settings page. Please note that this action is permanent and will delete all your data including documents, flashcards, and progress.",
  },
  {
    category: "Billing",
    question: "Is Jadoo free to use?",
    answer: "Jadoo offers both free and premium plans. The free plan includes basic features, while premium plans unlock advanced AI capabilities, unlimited storage, and priority support.",
  },
  {
    category: "Billing",
    question: "How do I upgrade to a premium plan?",
    answer: "Visit the Pricing page from the main menu to view available plans and upgrade your account. You can pay monthly or annually for additional savings.",
  },
  {
    category: "Features",
    question: "How do I share my quiz results?",
    answer: "After completing a quiz, you'll see a 'Share' button on the results page. Click it to generate a shareable link that others can use to view your quiz and attempt it themselves.",
  },
  {
    category: "Features",
    question: "Can I export my flashcards?",
    answer: "Yes! Go to the Flashcards page, select the deck you want to export, and click the export button. You can export in CSV or JSON format.",
  },
  {
    category: "Study Tips",
    question: "What is the Quiz of the Day?",
    answer: "The Quiz of the Day is a daily challenge that helps you maintain your study streak. Complete it each day to earn bonus points and track your consistency.",
  },
  {
    category: "Account",
    question: "How do I update my profile information?",
    answer: "Go to your Profile page from the user menu in the header. You can update your name, email, profile picture, and other personal information there.",
  },
  {
    category: "Technical",
    question: "What browsers are supported?",
    answer: "Jadoo works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.",
  },
  {
    category: "Features",
    question: "How does the AI generate study materials?",
    answer: "Our AI uses advanced language models trained on vast amounts of educational content. It analyzes your input and generates relevant, accurate study materials tailored to your needs.",
  },
  {
    category: "Billing",
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time from the Settings page. You'll continue to have access to premium features until the end of your billing period.",
  },
];
