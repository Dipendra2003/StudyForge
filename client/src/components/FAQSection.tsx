import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "What subjects does StudyForge support?",
    answer: "StudyForge supports a wide range of academic subjects including Mathematics, Science (Physics, Chemistry, Biology), Computer Science, History, Literature, Languages, and more. The AI adapts to understand context across all these domains."
  },
  {
    question: "How accurate are the answers provided by StudyForge?",
    answer: "StudyForge uses advanced AI models to provide highly accurate information. However, for critical academic work, we always recommend verifying important facts with authoritative sources or your instructors."
  },
  {
    question: "Can StudyForge help with programming assignments?",
    answer: "Yes! StudyForge can generate code solutions in multiple programming languages including Python, JavaScript, Java, C++, and more. It provides explanations with each solution to help you understand the concepts."
  },
  {
    question: "Is my study data kept private?",
    answer: "Absolutely. Your study materials, questions, and interactions are kept private and secure. We use industry-standard encryption and do not share your content with third parties."
  },
  {
    question: "How do I get the most out of StudyForge?",
    answer: "For best results, ask specific questions, upload relevant study materials, and use the AI to explain concepts you're struggling with. The more context you provide, the more tailored the assistance will be to your needs."
  }
];

export default function FAQSection() {
  return (
    <section className="pt-20 pb-10 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get answers to common questions about StudyForge and how it can help with your studies.
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
                <AccordionContent className="text-gray-600 dark:text-gray-300 mt-2">
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
