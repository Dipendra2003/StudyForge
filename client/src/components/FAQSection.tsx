import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "When will the product be released?",
    answer: "We're targeting a launch in Q1 2024. Join our waitlist to be notified when we go live and to get early access."
  },
  {
    question: "How much will it cost?",
    answer: "We'll offer flexible pricing tiers for individuals, teams, and enterprises. Waitlist members will receive special early adopter pricing."
  },
  {
    question: "What platforms will be supported?",
    answer: "Our product will work on all major platforms including Windows, macOS, iOS, Android, and all modern web browsers."
  },
  {
    question: "Is there a free trial available?",
    answer: "Yes, we'll offer a 14-day free trial so you can experience the full power of our product before making a commitment."
  },
  {
    question: "What kind of support do you offer?",
    answer: "We provide 24/7 customer support via chat, email, and comprehensive documentation. Premium tiers include dedicated support agents."
  }
];

export default function FAQSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get answers to common questions about our product.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full divide-y">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="py-4 border-0">
                <AccordionTrigger className="font-bold text-xl hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 mt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
