import type {
  AIImageAnalyzer,
  AnalysisResponse,
  FoodAnalysisResult,
  ScanIngredientsResponse,
  ScannedIngredient,
  SuggestRecipesResponse,
  RecipeSuggestion,
} from "./types";
import {
  ANALYSIS_PROMPT,
  SCAN_INGREDIENTS_PROMPT,
  RECIPE_SUGGESTION_PROMPT,
} from "./types";

export class OpenAIProvider implements AIImageAnalyzer {
  readonly providerName = "openai" as const;

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private async getOpenAI() {
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async analyzeImage(imageUrl: string): Promise<AnalysisResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = await this.getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{"foods": []}'
    );

    const foods: FoodAnalysisResult[] = result.foods.map((f: any) => ({
      name: f.name || "Unknown",
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
      confidence: f.confidence || 0.9,
      quantity: f.quantity || 1,
      unit: f.unit || "serving",
    }));

    return { foods };
  }

  async scanIngredients(imageUrl: string): Promise<ScanIngredientsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = await this.getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: SCAN_INGREDIENTS_PROMPT,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{"ingredients": []}'
    );

    const ingredients: ScannedIngredient[] = (result.ingredients || []).map(
      (i: any) => ({
        name: i.name || "Unknown",
        quantity: i.quantity || 1,
        unit: i.unit || "unit",
        category: i.category || "other",
        confidence: i.confidence || 0.9,
      })
    );

    return { ingredients };
  }

  async suggestRecipes(
    ingredients: string[],
    cuisineMode: string,
    maxRecipes: number,
    dietaryRestrictions?: string[]
  ): Promise<SuggestRecipesResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = await this.getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: RECIPE_SUGGESTION_PROMPT(
            ingredients,
            cuisineMode,
            maxRecipes,
            dietaryRestrictions
          ),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{"recipes": []}'
    );

    const recipes: RecipeSuggestion[] = (result.recipes || []).map(
      (r: any) => ({
        title: r.title || "Untitled Recipe",
        description: r.description || "",
        ingredients: r.ingredients || [],
        instructions: r.instructions || [],
        prepTime: r.prepTime || 15,
        cookTime: r.cookTime || 30,
        servings: r.servings || 2,
        difficulty: r.difficulty || "medium",
        macros: {
          calories: r.macros?.calories || 0,
          protein: r.macros?.protein || 0,
          carbs: r.macros?.carbs || 0,
          fat: r.macros?.fat || 0,
        },
      })
    );

    return { recipes };
  }
}
