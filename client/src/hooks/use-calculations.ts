import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertCalculation } from "@shared/schema";

export function useCalculations() {
  return useQuery({
    queryKey: ["calculations"],
    queryFn: async () => {
      const res = await fetch(api.calculations.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch calculations");
      return res.json();
    },
  });
}

export function useSaveCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertCalculation, "patientId">) => {
      const res = await fetch(api.calculations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save calculation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculations"] });
    },
  });
}
