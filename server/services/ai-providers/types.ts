export interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  quantity: number;
  unit: string;
}

export interface AnalysisResponse {
  foods: FoodAnalysisResult[];
}

export interface ScannedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
}

export interface ScanIngredientsResponse {
  ingredients: ScannedIngredient[];
}

export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeSuggestion {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  macros: RecipeMacros;
}

export interface SuggestRecipesResponse {
  recipes: RecipeSuggestion[];
}

export type AIProviderType = "openai" | "gemini";

export interface AIImageAnalyzer {
  readonly providerName: AIProviderType;
  analyzeImage(imageUrl: string): Promise<AnalysisResponse>;
  scanIngredients(imageUrl: string): Promise<ScanIngredientsResponse>;
  suggestRecipes(
    ingredients: string[],
    cuisineMode: string,
    maxRecipes: number,
    dietaryRestrictions?: string[]
  ): Promise<SuggestRecipesResponse>;
  isConfigured(): boolean;
}

export const ANALYSIS_PROMPT = `Identify the food items in this image. For each item, estimate the quantity, unit, calories, protein (g), carbs (g), and fat (g). Return a JSON object with a 'foods' array containing objects with: name, calories, protein, carbs, fat, quantity, unit, confidence (0-1).`;

export const SCAN_INGREDIENTS_PROMPT = `Identify all the ingredients visible in this image. For each ingredient, provide the name, estimated quantity, unit, and category (produce, protein, dairy, grains, pantry, spices, frozen, beverages, other). Return a JSON object with an 'ingredients' array containing objects with: name, quantity, unit, category, confidence (0-1).`;

export const RECIPE_SUGGESTION_PROMPT = (
  ingredients: string[],
  cuisineMode: string,
  maxRecipes: number,
  dietaryRestrictions?: string[]
) => `Given these available ingredients: ${ingredients.join(", ")}

Create ${maxRecipes} recipe suggestion(s) in the "${cuisineMode}" style.
${
  dietaryRestrictions?.length
    ? `Dietary restrictions to follow: ${dietaryRestrictions.join(", ")}`
    : ""
}

For each recipe, provide:
- title: Recipe name
- description: Brief 1-2 sentence description
- ingredients: Array of ingredient strings with quantities (use available ingredients primarily, can suggest a few common pantry staples if needed)
- instructions: Array of step-by-step cooking instructions
- prepTime: Preparation time in minutes
- cookTime: Cooking time in minutes
- servings: Number of servings
- difficulty: "easy", "medium", or "hard"
- macros: Object with calories, protein, carbs, fat (estimated per serving)

Return a JSON object with a 'recipes' array.`;
