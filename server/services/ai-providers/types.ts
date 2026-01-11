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

export type AIProviderType = "openai" | "gemini";

export interface AIImageAnalyzer {
  readonly providerName: AIProviderType;
  analyzeImage(imageUrl: string): Promise<AnalysisResponse>;
  isConfigured(): boolean;
}

export const ANALYSIS_PROMPT = `Identify the food items in this image. For each item, estimate the quantity, unit, calories, protein (g), carbs (g), and fat (g). Return a JSON object with a 'foods' array containing objects with: name, calories, protein, carbs, fat, quantity, unit, confidence (0-1).`;
