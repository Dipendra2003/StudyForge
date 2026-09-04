import { motion } from "framer-motion";
import { Brain, FileText, FileQuestion, Code2, CalendarCheck, Layers } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Chat Assistant",
    description: "Get instant answers to subject-related questions across multiple domains including science, math, history, and programming. Our neural engine adapts to your specific learning context.",
    color: "from-purple-500 to-indigo-500",
    shadow: "shadow-indigo-500/30",
    bgGlow: "bg-indigo-500/10"
  },
  {
    icon: FileText,
    title: "Document Summarization",
    description: "Upload study materials and get concise summaries, key points, and explanations tailored to your learning style.",
    color: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-500/30",
    bgGlow: "bg-emerald-500/10"
  },
  {
    icon: FileQuestion,
    title: "MCQ Generation",
    description: "Generate practice quizzes with multiple-choice questions to test your knowledge and improve retention.",
    color: "from-amber-400 to-orange-500",
    shadow: "shadow-amber-500/30",
    bgGlow: "bg-amber-500/10"
  },
  {
    icon: Layers,
    title: "Smart Flashcards",
    description: "Automatically generate interactive flashcards from your notes and study materials to master concepts through active recall.",
    color: "from-violet-400 to-purple-500",
    shadow: "shadow-violet-500/30",
    bgGlow: "bg-violet-500/10"
  },
  {
    icon: Code2,
    title: "Code Generation",
    description: "Get help with programming problems across various languages with step-by-step explanations.",
    color: "from-blue-400 to-cyan-500",
    shadow: "shadow-blue-500/30",
    bgGlow: "bg-blue-500/10"
  },
  {
    icon: CalendarCheck,
    title: "Study Planning",
    description: "Create personalized study schedules based on your goals, learning pace, and exams.",
    color: "from-rose-400 to-pink-500",
    shadow: "shadow-rose-500/30",
    bgGlow: "bg-rose-500/10"
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
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, type: "spring" } }
};

export default function Features() {
  return (
    <section className="py-24 bg-gray-50/30 dark:bg-gray-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Brain size={16} />
            <span className="text-sm font-bold uppercase tracking-wider">Supercharged Toolkit</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-gray-900 dark:text-white">
            Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">AI Study Tools</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed">
            Jadoo 2.0 offers powerful learning assistance with these cutting-edge features designed to enhance your study experience.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={index}
                variants={item}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-[2rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 p-8 md:p-10"
              >
                {/* Ambient Hover Glow */}
                <div className={`absolute -right-20 -top-20 w-48 h-48 bg-gradient-to-br ${feature.color} rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`}></div>
                
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg ${feature.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={32} strokeWidth={2.5} className="drop-shadow-sm" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
