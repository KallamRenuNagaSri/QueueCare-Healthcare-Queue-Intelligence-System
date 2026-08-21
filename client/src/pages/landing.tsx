import { Link } from "wouter";
import { motion } from "framer-motion";
import { Clock, Users, ArrowRight, CheckCircle2, ShieldPlus } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_Mar_10,_2026,_09_04_52_PM_1773156915193.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col font-sans">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="QueueCare Logo" className="h-10 object-contain" />
          <span className="text-2xl font-bold text-foreground">QueueCare</span>
        </div>
        <div className="hidden md:flex gap-8 font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2.5 rounded-xl font-medium text-primary hover:bg-primary/5 transition-colors">
            Login
          </Link>
          <Link href="/login" className="px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300">
            Staff Portal
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] opacity-70 pointer-events-none" />
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[80px] opacity-60 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-primary text-sm font-semibold shadow-soft border border-border/50 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Next-Gen Hospital Management
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-[1.1] mb-8">
              Smart Hospital <br />
              <span className="text-gradient">Queue Management</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Reduce patient wait times, streamline department workflows, and provide transparent estimated serving times with QueueCare's intelligent platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold bg-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 text-lg">
                Login as Staff
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold bg-white text-foreground shadow-soft border border-border/50 hover:border-border hover:shadow-md transition-all duration-300 flex items-center justify-center text-lg">
                Learn More
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Powerful Features for Modern Hospitals</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to manage patient flow efficiently without the chaos of traditional waiting rooms.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Patient Queue Tracking", desc: "Monitor real-time patient positions across multiple departments from a single unified dashboard.", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: Clock, title: "Smart Wait Time Estimation", desc: "Automatically calculate and update estimated wait times based on live department activity.", color: "text-green-500", bg: "bg-green-50" },
              { icon: ShieldPlus, title: "Department Management", desc: "Isolate queues for Cardiology, Neurology, and General wards with specialized views for staff.", color: "text-purple-500", bg: "bg-purple-50" }
            ].map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-background rounded-2xl p-8 border border-border/50 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-xl ${feat.bg} flex items-center justify-center mb-6`}>
                  <feat.icon className={`w-7 h-7 ${feat.color}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feat.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-background relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">How QueueCare Works</h2>
              <p className="text-lg text-muted-foreground mb-12">Our streamlined 4-step process ensures patients know exactly when they'll be seen, while giving staff complete control over the waiting room.</p>
              
              <div className="space-y-8">
                {[
                  "Staff logs into the secure QueueCare dashboard.",
                  "Patient is checked into their specific department.",
                  "System automatically assigns a queue position.",
                  "Estimated waiting time is calculated and displayed."
                ].map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-1">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">Step {i + 1}</h4>
                      <p className="text-muted-foreground">{step}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 relative w-full aspect-square md:aspect-video rounded-3xl overflow-hidden shadow-2xl border border-border/50">
              {/* landing page hero scenic hospital hallway or modern clinic UI */}
              <img 
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=800&fit=crop" 
                alt="Hospital Dashboard Preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl w-full text-white">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-lg">Cardiology Dept</span>
                    <span className="bg-accent px-3 py-1 rounded-full text-xs font-bold">Active</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white/70 text-sm mb-1">Next Patient</p>
                      <p className="text-2xl font-bold">#PT-8429</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-sm mb-1">Est. Wait</p>
                      <p className="text-2xl font-bold">12 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border/50 py-12 mt-auto relative z-10">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={logoImg} alt="QueueCare Logo" className="h-8 object-contain" />
            <span className="text-xl font-bold text-foreground">QueueCare</span>
          </div>
          <p className="text-muted-foreground">© {new Date().getFullYear()} QueueCare Systems. Smart Hospital Management.</p>
        </div>
      </footer>
    </div>
  );
}
