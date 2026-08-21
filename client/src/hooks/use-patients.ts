import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Helper to log Zod errors nicely
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // For resilience in the frontend, if the schema format slightly mismatches 
    // due to DB dates coming as strings, we fallback to forced cast.
    // In a strict environment, throw result.error.
    return data as T; 
  }
  return result.data;
}

export function useStats() {
  return useQuery({
    queryKey: [api.patients.stats.path],
    queryFn: async () => {
      const res = await fetch(api.patients.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch statistics");
      const data = await res.json();
      return parseWithLogging(api.patients.stats.responses[200], data, "patients.stats");
    },
    refetchInterval: 10000, // Poll every 10s for real-time feel
  });
}

export function useQueue(department: string) {
  return useQuery({
    queryKey: ["queue", department],
    queryFn: async () => {
      const url = buildUrl(api.patients.queue.path, { department });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch queue");
      const data = await res.json();
      return parseWithLogging(api.patients.queue.responses[200], data, `patients.queue.${department}`);
    },
    refetchInterval: 5000, // Poll every 5s
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.patients.checkin.input>) => {
      const res = await fetch(api.patients.checkin.path, {
        method: api.patients.checkin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to check-in patient");
      }

      const data = await res.json();
      return parseWithLogging(api.patients.checkin.responses[201], data, "patients.checkin");
    },
    onSuccess: (data) => {
      toast({
        title: "Patient Checked In",
        description: `${data.name} added to the ${data.department} queue.`,
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [api.patients.stats.path] });
      queryClient.invalidateQueries({ queryKey: ["queue", data.department] });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
