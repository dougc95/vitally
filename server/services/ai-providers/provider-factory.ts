import type { AIImageAnalyzer, AIProviderType } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

const providers: Record<AIProviderType, () => AIImageAnalyzer> = {
  openai: () => new OpenAIProvider(),
  gemini: () => new GeminiProvider(),
};

export function getAIProvider(providerType: AIProviderType): AIImageAnalyzer {
  const providerFactory = providers[providerType];
  if (!providerFactory) {
    throw new Error(`Unknown AI provider: ${providerType}`);
  }
  return providerFactory();
}

export function getAvailableProviders(): AIProviderType[] {
  const available: AIProviderType[] = [];
  for (const [type, factory] of Object.entries(providers)) {
    const provider = factory();
    if (provider.isConfigured()) {
      available.push(type as AIProviderType);
    }
  }
  return available;
}

export function getDefaultProvider(): AIProviderType {
  // Prefer OpenAI if configured, otherwise fallback to Gemini
  const openai = new OpenAIProvider();
  if (openai.isConfigured()) return "openai";

  const gemini = new GeminiProvider();
  if (gemini.isConfigured()) return "gemini";

  return "openai"; // Default even if not configured (will error on use)
}
