import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Bot, 
  Settings, 
  Zap, 
  Users, 
  Brain, 
  Cpu, 
  Network,
  ArrowRight,
  Check,
  Sparkles,
  Database,
  Globe,
  Shield
} from 'lucide-react';
import Logo from './Logo';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
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
      icon: MessageCircle,
      title: "Input Query",
      description: "Natural language interaction",
      gradient: "from-blue-500 to-cyan-500"
    },
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
      title: "Intelligent Response",
      description: "Contextual output delivery",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const features = [
    {
      icon: Bot,
      title: "Multi-Agent System",
      description: "Deploy multiple specialized AI agents working in harmony to tackle complex tasks."
    },
    {
      icon: Settings,
      title: "MCP Protocol Support",
      description: "Seamlessly integrate with external tools and services through Model Context Protocol."
    },
    {
      icon: Database,
      title: "Context Management",
      description: "Intelligent context handling across conversations and agent interactions."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Built with security-first architecture for enterprise-grade deployments."
    },
    {
      icon: Globe,
      title: "Real-time Collaboration",
      description: "Enable team collaboration with shared conversations and agent configurations."
    },
    {
      icon: Cpu,
      title: "Performance Optimized",
      description: "Highly optimized for speed and efficiency with real-time WebSocket connections."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3 bg-white rounded-full px-6 py-3 shadow-lg border border-gray-100">
                <Logo size="md" />
                <span className="text-lg font-bold text-gray-900">Avalara Studio</span>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Agentic AI
              </span>
              <br />
              Platform
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Orchestrate multiple AI agents with seamless tool integration. 
              Build intelligent workflows that adapt, learn, and deliver results.
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={onGetStarted}
                className="btn-primary text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <div className="flex items-center text-gray-600">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <span>No setup required</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Workflow Diagram Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the power of orchestrated AI agents working together seamlessly
            </p>
          </motion.div>

          {/* Flow Diagram */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className="relative"
                >
                  <div className="text-center">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center shadow-lg`}>
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Arrow between steps */}
                  {index < flowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-10 -right-4 z-10">
                      <ArrowRight className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Seamless Tool Integration
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect, orchestrate, and scale AI agents with enterprise-grade capabilities
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="card hover:shadow-lg transition-shadow duration-300"
              >
                <div className="card-body">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join the future of AI-powered automation and experience the power of intelligent agent orchestration.
            </p>
            <button
              onClick={onGetStarted}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Start Building Now
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 