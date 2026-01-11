import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  NutritionGoal,
  MealWithItems,
  AnalyzeImageResponse,
  UpdateNutritionGoalRequest,
  CreateMealSchemaRequest,
} from "@shared/schema";

export function useNutritionGoals() {
  return useQuery<NutritionGoal>({
    queryKey: [api.nutrition.goals.get.path],
    queryFn: async () => {
      const res = await fetch(api.nutrition.goals.get.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch nutrition goals");
      return res.json();
    },
  });
}

export function useUpdateNutritionGoals() {
  const queryClient = useQueryClient();
  return useMutation<NutritionGoal, Error, UpdateNutritionGoalRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.nutrition.goals.update.path, {
        method: api.nutrition.goals.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update nutrition goals");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.goals.get.path],
      });
    },
  });
}

export function useMeals(date: string) {
  return useQuery<MealWithItems[]>({
    queryKey: [api.nutrition.meals.list.path, date],
    queryFn: async () => {
      const url = `${api.nutrition.meals.list.path}?date=${date}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meals");
      return res.json();
    },
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation<MealWithItems, Error, CreateMealSchemaRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.nutrition.meals.create.path, {
        method: api.nutrition.meals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create meal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.meals.list.path],
      });
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (mealId) => {
      const url = buildUrl(api.nutrition.meals.delete.path, { id: mealId });
      const res = await fetch(url, {
        method: api.nutrition.meals.delete.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete meal");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.meals.list.path],
      });
    },
  });
}

export type AIProvider = "openai" | "gemini";

export interface AnalyzeImageParams {
  imageUrl: string;
  provider?: AIProvider;
}

export function useAnalyzeImage() {
  return useMutation<AnalyzeImageResponse, Error, AnalyzeImageParams>({
    mutationFn: async ({ imageUrl, provider }) => {
      const res = await fetch(api.nutrition.analysis.analyze.path, {
        method: api.nutrition.analysis.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, provider }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze image");
      }
      return res.json();
    },
  });
}
