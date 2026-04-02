import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send, Github, Linkedin, MessageSquare } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
      
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header onNavigate={() => {}} />

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full opacity-70 blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
                Get in <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Touch</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Have questions or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">Send us a Message</CardTitle>
                    <CardDescription>Fill out the form below and we'll get back to you shortly</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium">
                            Your Name
                          </label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Dipendra Kumar"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium">
                            Email Address
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="StudyForge@gmail.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium">
                          Subject
                        </label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="How can we help you?"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">
                          Message
                        </label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Tell us more about your inquiry..."
                          rows={6}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white font-bold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-6"
              >
                {/* Contact Details Card */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Reach out to us through any of these channels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email</h3>
                        <a
                          href="mailto:dipendrak299@gmail.com"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                        >
                          dipendrak299@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Support</h3>
                        <a
                          href="https://github.com/Dipendra2003/StudyForge/issues"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                        >
                          GitHub Issues
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Location</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Remote - Available Worldwide
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media Card */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Connect With Us</CardTitle>
                    <CardDescription>Follow us on social media</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <a
                        href="https://x.com/Dipendrasah76"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FaXTwitter className="h-5 w-5" />
                        <span className="text-sm font-medium">Twitter</span>
                      </a>
                      <a
                        href="https://github.com/Dipendra2003/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Github className="h-5 w-5" />
                        <span className="text-sm font-medium">GitHub</span>
                      </a>
                      <a
                        href="https://www.linkedin.com/in/dipendra-kumar-b077b9286/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                        <span className="text-sm font-medium">LinkedIn</span>
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Response Card */}
                <Card className="shadow-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <Phone className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">Quick Response</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        We typically respond within 24 hours during business days
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
