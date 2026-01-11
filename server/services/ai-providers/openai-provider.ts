import type {
  AIImageAnalyzer,
  AnalysisResponse,
  FoodAnalysisResult,
} from "./types";
import { ANALYSIS_PROMPT } from "./types";

export class OpenAIProvider implements AIImageAnalyzer {
  readonly providerName = "openai" as const;

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async analyzeImage(imageUrl: string): Promise<AnalysisResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI API key not configured");
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
}
