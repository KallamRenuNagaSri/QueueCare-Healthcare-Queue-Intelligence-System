import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useLogin } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import logoImg from "@assets/ChatGPT_Image_Mar_10,_2026,_09_04_52_PM_1773156915193.png";

export default function Login() {
  const login = useLogin();
  
  const form = useForm<z.infer<typeof api.auth.login.input>>({
    resolver: zodResolver(api.auth.login.input),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = (data: z.infer<typeof api.auth.login.input>) => {
    login.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-accent/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-soft-lg border border-border/50 relative z-10"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <div className="mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform w-20 h-20 flex items-center justify-center">
              <img src={logoImg} alt="QueueCare Logo" className="h-20 object-contain" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Staff Login</h1>
          <p className="text-muted-foreground">Sign in to manage patient queues</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <input 
                {...form.register("email")}
                type="email"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground"
                placeholder="staff@hospital.com"
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-destructive text-sm mt-2">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input 
                {...form.register("password")}
                type="password"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-destructive text-sm mt-2">{form.formState.errors.password.message}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={login.isPending}
            className="w-full py-4 rounded-xl font-semibold bg-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {login.isPending ? "Authenticating..." : "Login to Dashboard"}
            {!login.isPending && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
