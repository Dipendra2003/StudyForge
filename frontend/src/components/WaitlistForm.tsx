import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useWaitlist } from "@/hooks/use-waitlist";
import { waitlistFormSchema } from "@shared/schema";
import type { z } from "zod";

type FormValues = z.infer<typeof waitlistFormSchema>;

export default function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { submitToWaitlist, isPending } = useWaitlist();

  const form = useForm<FormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      consent: false,
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      await submitToWaitlist(data);
      setSubmitted(true);
      toast({
        title: "Success!",
        description: "You've been added to our waitlist.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "There was an error joining the waitlist. Please try again.",
      });
    }
  }

  const shareOnTwitter = () => {
    const text = "I just joined the waitlist for this revolutionary new product. You should check it out too!";
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <section className="py-20 bg-gray-50 relative">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent"></div>
      
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="grid md:grid-cols-2">
            <div className="p-10 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-4">Join the Waitlist</h2>
              <p className="text-gray-600 mb-8">
                Be among the first to experience our revolutionary product. Early adopters receive exclusive benefits and special pricing.
              </p>
              
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Company" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="consent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  I agree to receive updates about the product launch and acknowledge the Privacy Policy.
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                          disabled={isPending}
                        >
                          {isPending ? "Joining..." : "Reserve My Spot"}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="thanks"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="text-5xl mb-4 text-emerald-500">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
                    <p className="text-gray-600 mb-6">
                      Thanks for joining our waitlist. We'll be in touch soon with updates on our launch.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-primary hover:text-primary/90 hover:bg-primary/5 font-medium flex items-center gap-2" 
                        onClick={shareOnTwitter}
                      >
                        <i className="fab fa-twitter"></i> Share
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-primary hover:text-primary/90 hover:bg-primary/5 font-medium flex items-center gap-2" 
                        onClick={shareOnLinkedIn}
                      >
                        <i className="fab fa-linkedin"></i> Share
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-primary p-10 hidden md:block">
              <div className="h-full flex flex-col justify-center">
                <div className="text-white space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                        <i className="fas fa-bolt text-white"></i>
                      </div>
                    </div>
                    <p className="font-medium">Early access to all features</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                        <i className="fas fa-tag text-white"></i>
                      </div>
                    </div>
                    <p className="font-medium">Special founding member pricing</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                        <i className="fas fa-comment text-white"></i>
                      </div>
                    </div>
                    <p className="font-medium">Direct input on product roadmap</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                        <i className="fas fa-headset text-white"></i>
                      </div>
                    </div>
                    <p className="font-medium">Priority customer support</p>
                  </div>
                  
                  <div className="pt-6">
                    {/* Abstract tech elements SVG instead of stock photo */}
                    <div className="rounded-lg bg-white/10 p-4">
                      <svg className="w-full h-40" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 80L40 60L60 70L80 40L100 50L120 30L140 45L160 20L180 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="40" cy="60" r="4" fill="white" />
                        <circle cx="60" cy="70" r="4" fill="white" />
                        <circle cx="80" cy="40" r="4" fill="white" />
                        <circle cx="100" cy="50" r="4" fill="white" />
                        <circle cx="120" cy="30" r="4" fill="white" />
                        <circle cx="140" cy="45" r="4" fill="white" />
                        <circle cx="160" cy="20" r="4" fill="white" />
                        <rect x="10" y="10" width="180" height="80" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" rx="4" />
                        <line x1="10" y1="30" x2="190" y2="30" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="10" y1="50" x2="190" y2="50" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="10" y1="70" x2="190" y2="70" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="90" y1="10" x2="90" y2="90" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="130" y1="10" x2="130" y2="90" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                        <line x1="170" y1="10" x2="170" y2="90" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
