import { motion } from "framer-motion";

const features = [
  {
    icon: "brain",
    title: "AI-Powered Q&A",
    description: "Get instant answers to subject-related questions across multiple domains including science, math, history, and programming."
  },
  {
    icon: "file-alt",
    title: "Document Summarization",
    description: "Upload study materials and get concise summaries, key points, and explanations tailored to your learning style."
  },
  {
    icon: "question-circle",
    title: "MCQ Generation",
    description: "Generate practice quizzes with multiple-choice questions to test your knowledge and improve retention."
  },
  {
    icon: "microphone-alt",
    title: "Voice Interaction",
    description: "Speak your questions and get audio responses for a hands-free learning experience while multitasking."
  },
  {
    icon: "code",
    title: "Code Generation",
    description: "Get help with programming problems across various languages with step-by-step explanations and comments."
  },
  {
    icon: "calendar-check",
    title: "Study Planning",
    description: "Create personalized study schedules based on your goals, learning pace, and upcoming exams."
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function Features() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">AI Study Tools</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Jadoo 2.0 offers powerful learning assistance with these cutting-edge features designed to enhance your study experience.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              variants={item}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <i className={`fas fa-${feature.icon} text-primary text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
