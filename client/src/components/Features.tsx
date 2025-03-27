import { motion } from "framer-motion";

const features = [
  {
    icon: "bolt",
    title: "AI-Powered Automation",
    description: "Let our smart algorithms handle repetitive tasks while you focus on what matters most."
  },
  {
    icon: "users",
    title: "Seamless Collaboration",
    description: "Work together in real-time with your team, no matter where they are located."
  },
  {
    icon: "chart-line",
    title: "Advanced Analytics",
    description: "Gain insights with comprehensive data visualization and reporting tools."
  },
  {
    icon: "mobile-alt",
    title: "Cross-Platform Access",
    description: "Access your workspace from any device with our responsive web and mobile apps."
  },
  {
    icon: "shield-alt",
    title: "Enterprise-Grade Security",
    description: "Rest easy with our bank-level encryption and secure data storage protocols."
  },
  {
    icon: "plug",
    title: "Seamless Integrations",
    description: "Connect with your favorite tools without missing a beat in your workflow."
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
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Designed with your needs in mind, our product delivers exceptional value through these key features.
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
              className="bg-gray-50 rounded-xl p-8 hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <i className={`fas fa-${feature.icon} text-primary text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
