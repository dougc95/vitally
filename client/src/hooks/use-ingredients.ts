import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  UserIngredient,
  SavedRecipe,
  AddIngredientRequest,
  AddIngredientsRequest,
  ScanIngredientsResponse,
  SuggestRecipesResponse,
  SaveRecipeRequest,
  CuisineMode,
} from "@shared/schema";

export type AIProvider = "openai" | "gemini";

// === INGREDIENTS HOOKS ===

export function useIngredients() {
  return useQuery<UserIngredient[]>({
    queryKey: [api.nutrition.ingredients.list.path],
    queryFn: async () => {
      const res = await fetch(api.nutrition.ingredients.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch ingredients");
      return res.json();
    },
  });
}

export function useAddIngredient() {
  const queryClient = useQueryClient();
  return useMutation<UserIngredient, Error, AddIngredientRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.nutrition.ingredients.add.path, {
        method: api.nutrition.ingredients.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add ingredient");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.ingredients.list.path],
      });
    },
  });
}

export function useAddIngredients() {
  const queryClient = useQueryClient();
  return useMutation<UserIngredient[], Error, AddIngredientsRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.nutrition.ingredients.addBulk.path, {
        method: api.nutrition.ingredients.addBulk.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add ingredients");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.ingredients.list.path],
      });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (ingredientId) => {
      const url = buildUrl(api.nutrition.ingredients.delete.path, {
        id: ingredientId,
      });
      const res = await fetch(url, {
        method: api.nutrition.ingredients.delete.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete ingredient");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.ingredients.list.path],
      });
    },
  });
}

export interface ScanIngredientsParams {
  imageUrl: string;
  provider?: AIProvider;
}

export function useScanIngredients() {
  return useMutation<ScanIngredientsResponse, Error, ScanIngredientsParams>({
    mutationFn: async ({ imageUrl, provider }) => {
      const res = await fetch(api.nutrition.ingredients.scan.path, {
        method: api.nutrition.ingredients.scan.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, provider }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to scan ingredients");
      }
      return res.json();
    },
  });
}

// === RECIPES HOOKS ===

export interface SuggestRecipesParams {
  cuisineMode?: CuisineMode;
  provider?: AIProvider;
  maxRecipes?: number;
  dietaryRestrictions?: string[];
}

export function useSuggestRecipes() {
  return useMutation<SuggestRecipesResponse, Error, SuggestRecipesParams>({
    mutationFn: async (params) => {
      const res = await fetch(api.nutrition.recipes.suggest.path, {
        method: api.nutrition.recipes.suggest.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to suggest recipes");
      }
      return res.json();
    },
  });
}

export function useSavedRecipes() {
  return useQuery<SavedRecipe[]>({
    queryKey: [api.nutrition.recipes.saved.path],
    queryFn: async () => {
      const res = await fetch(api.nutrition.recipes.saved.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch saved recipes");
      return res.json();
    },
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation<SavedRecipe, Error, SaveRecipeRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.nutrition.recipes.save.path, {
        method: api.nutrition.recipes.save.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save recipe");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.recipes.saved.path],
      });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (recipeId) => {
      const url = buildUrl(api.nutrition.recipes.delete.path, { id: recipeId });
      const res = await fetch(url, {
        method: api.nutrition.recipes.delete.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete recipe");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.nutrition.recipes.saved.path],
      });
    },
  });
}
