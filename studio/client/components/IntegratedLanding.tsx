import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Settings, 
  Zap, 
  Brain, 
  Cpu, 
  Network,
  ArrowRight,
  Plus,
  Database,
  Globe,
  Shield,
  Sparkles
} from 'lucide-react';
import Logo from './Logo';
import DataFlowAnimation from './DataFlowAnimation';

interface IntegratedLandingProps {
  onCreateNewChat: () => void;
}

const IntegratedLanding: React.FC<IntegratedLandingProps> = ({ onCreateNewChat }) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const flowSteps = [
    {
      icon: Brain,
      title: "AI Processing",
      description: "Multi-agent orchestration",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Network,
      title: "MCP Integration", 
      description: "Tool & service connection",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Smart Response",
      description: "Contextual output delivery",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const features = [
    {
      icon: Bot,
      title: "Multi-Agent System",
      description: "Deploy specialized AI agents working in harmony."
    },
    {
      icon: Settings,
      title: "MCP Protocol Support",
      description: "Integrate with external tools seamlessly."
    },
    {
      icon: Database,
      title: "Context Management",
      description: "Intelligent context across conversations."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Built with security-first architecture."
    },
    {
      icon: Globe,
      title: "Real-time Collaboration",
      description: "Team collaboration with shared conversations."
    },
    {
      icon: Cpu,
      title: "Performance Optimized",
      description: "Optimized for speed and efficiency."
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6">
        {/* New Hero Section */}
        <section className="grid md:grid-cols-2 gap-12 items-center my-8 md:my-16">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 !leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Avalara Studio
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-lg">
              The Agentic AI Workspace to orchestrate multiple AI agents with seamless tool integration. Build intelligent workflows that adapt, learn, and deliver results.
            </p>
            <button
              onClick={onCreateNewChat}
              className="btn-primary text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start New Chat
            </button>
          </motion.div>
          
          {/* Right Column - Visual Element */}
          <div className="relative w-full min-h-[350px] hidden md:flex items-center justify-center">
            <DataFlowAnimation />
          </div>
        </section>

        {/* Workflow Diagram Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="my-16 md:my-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Experience the power of orchestrated AI agents working together.
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {flowSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center shadow-lg`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow between steps */}
                {index < flowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="my-16 md:my-24"
        >
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Seamless Tool Integration
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Connect, orchestrate, and scale AI agents with enterprise-grade capabilities.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to transform your workflows?
          </h2>
          <p className="text-lg text-blue-100 mb-6 max-w-xl mx-auto">
            Experience the power of intelligent agent orchestration.
          </p>
          <button
            onClick={onCreateNewChat}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Building Now
            <ArrowRight className="w-5 h-5 ml-2 inline" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default IntegratedLanding; 