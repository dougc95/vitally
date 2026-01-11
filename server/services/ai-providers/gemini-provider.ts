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

export class GeminiProvider implements AIImageAnalyzer {
  readonly providerName = "gemini" as const;

  isConfigured(): boolean {
    return !!process.env.GOOGLE_GEMINI_API_KEY;
  }

  private async getModel() {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  private async prepareImagePart(imageUrl: string) {
    if (imageUrl.startsWith("data:")) {
      const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 image format");
      }
      return {
        inlineData: {
          data: matches[2],
          mimeType: matches[1],
        },
      };
    } else {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      return {
        inlineData: {
          data: base64,
          mimeType,
        },
      };
    }
  }

  private cleanJsonResponse(responseText: string): string {
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  async analyzeImage(imageUrl: string): Promise<AnalysisResponse> {
    if (!this.isConfigured()) {
      throw new Error("Google Gemini API key not configured");
    }

    const model = await this.getModel();
    const imagePart = await this.prepareImagePart(imageUrl);

    const result = await model.generateContent([
      ANALYSIS_PROMPT +
        " Respond ONLY with valid JSON, no markdown or additional text.",
      imagePart,
    ]);

    const responseText = result.response.text();
    const cleaned = this.cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned || '{"foods": []}');

    const foods: FoodAnalysisResult[] = (parsed.foods || []).map((f: any) => ({
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
      throw new Error("Google Gemini API key not configured");
    }

    const model = await this.getModel();
    const imagePart = await this.prepareImagePart(imageUrl);

    const result = await model.generateContent([
      SCAN_INGREDIENTS_PROMPT +
        " Respond ONLY with valid JSON, no markdown or additional text.",
      imagePart,
    ]);

    const responseText = result.response.text();
    const cleaned = this.cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned || '{"ingredients": []}');

    const ingredients: ScannedIngredient[] = (parsed.ingredients || []).map(
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
      throw new Error("Google Gemini API key not configured");
    }

    const model = await this.getModel();

    const result = await model.generateContent([
      RECIPE_SUGGESTION_PROMPT(
        ingredients,
        cuisineMode,
        maxRecipes,
        dietaryRestrictions
      ) + " Respond ONLY with valid JSON, no markdown or additional text.",
    ]);

    const responseText = result.response.text();
    const cleaned = this.cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned || '{"recipes": []}');

    const recipes: RecipeSuggestion[] = (parsed.recipes || []).map(
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
