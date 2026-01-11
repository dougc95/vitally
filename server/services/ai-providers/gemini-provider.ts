import type {
  AIImageAnalyzer,
  AnalysisResponse,
  FoodAnalysisResult,
} from "./types";
import { ANALYSIS_PROMPT } from "./types";

export class GeminiProvider implements AIImageAnalyzer {
  readonly providerName = "gemini" as const;

  isConfigured(): boolean {
    return !!process.env.GOOGLE_GEMINI_API_KEY;
  }

  async analyzeImage(imageUrl: string): Promise<AnalysisResponse> {
    if (!this.isConfigured()) {
      throw new Error("Google Gemini API key not configured");
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let imagePart: { inlineData: { data: string; mimeType: string } };

    if (imageUrl.startsWith("data:")) {
      // Handle base64 data URL
      const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 image format");
      }
      imagePart = {
        inlineData: {
          data: matches[2],
          mimeType: matches[1],
        },
      };
    } else {
      // Handle remote URL - fetch and convert to base64
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      imagePart = {
        inlineData: {
          data: base64,
          mimeType,
        },
      };
    }

    const result = await model.generateContent([
      ANALYSIS_PROMPT +
        " Respond ONLY with valid JSON, no markdown or additional text.",
      imagePart,
    ]);

    const responseText = result.response.text();

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse || '{"foods": []}');

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
}
