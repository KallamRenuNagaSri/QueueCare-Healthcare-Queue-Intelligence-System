import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  user: z
    .object({
      email: z.string().email(),
      role: z.string().optional(),
    })
    .optional(),
});

export function useLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: z.infer<typeof api.auth.login.input>) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await res.json();
          if (errorData.message) errorMessage = errorData.message;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      return loginResponseSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data.success) {
        const email = data.user?.email;
        if (email) {
          localStorage.setItem("userEmail", email);
        }
        toast({
          title: "Welcome Back",
          description: "Successfully logged into QueueCare.",
        });
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
