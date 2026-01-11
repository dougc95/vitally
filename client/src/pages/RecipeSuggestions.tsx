import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Flame,
  Heart,
  Leaf,
  Loader2,
  Pizza,
  Sparkles,
  Sun,
  Utensils,
  Zap,
  Bookmark,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  useIngredients,
  useSuggestRecipes,
  useSaveRecipe,
  type AIProvider,
} from "@/hooks/use-ingredients";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CuisineMode, RecipeSuggestion } from "@shared/schema";

const CUISINE_MODES: {
  id: CuisineMode;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "surprise", label: "Surprise Me", icon: Sparkles },
  { id: "asian", label: "Asian", icon: Utensils },
  { id: "mediterranean", label: "Mediterranean", icon: Sun },
  { id: "mexican", label: "Mexican", icon: Flame },
  { id: "italian", label: "Italian", icon: Pizza },
  { id: "healthy", label: "Healthy", icon: Heart },
  { id: "quick", label: "Quick", icon: Zap },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
];

export default function RecipeSuggestions() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<CuisineMode>("surprise");
  const [aiProvider, setAiProvider] = useState<AIProvider>("openai");
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { data: ingredients, isLoading: loadingIngredients } = useIngredients();
  const { mutate: suggestRecipes, isPending: isGenerating } =
    useSuggestRecipes();
  const { mutate: saveRecipe, isPending: isSaving } = useSaveRecipe();
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!ingredients?.length) {
      toast({
        title: "No Ingredients",
        description: "Add some ingredients to your pantry first",
        variant: "destructive",
      });
      return;
    }

    suggestRecipes(
      { cuisineMode: selectedMode, provider: aiProvider, maxRecipes: 3 },
      {
        onSuccess: (data) => {
          setRecipes(data.recipes);
          setHasGenerated(true);
        },
        onError: (err) => {
          toast({
            title: "Generation Failed",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleSaveRecipe = (recipe: RecipeSuggestion) => {
    saveRecipe(
      {
        title: recipe.title,
        description: recipe.description,
        cuisineMode: selectedMode,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        calories: recipe.macros.calories,
        protein: recipe.macros.protein,
        carbs: recipe.macros.carbs,
        fat: recipe.macros.fat,
      },
      {
        onSuccess: () => {
          toast({
            title: "Saved!",
            description: "Recipe added to your collection",
          });
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <PageLayout
      title="Recipe Ideas"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/nutrition/ingredients")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Pantry
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Ingredient Count */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">
                {loadingIngredients
                  ? "Loading..."
                  : `${ingredients?.length || 0} ingredients available`}
              </div>
              <div className="text-sm text-muted-foreground">
                From your pantry
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/nutrition/ingredients")}
          >
            Edit
          </Button>
        </div>

        {/* Cuisine Mode Selector */}
        <div>
          <h3 className="font-semibold mb-3">Choose a Style</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CUISINE_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    selectedMode === mode.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Provider Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">AI:</span>
          {(["openai", "gemini"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setAiProvider(p)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                aiProvider === p
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {p === "openai" ? "OpenAI" : "Gemini"}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <Button
          size="lg"
          className="w-full rounded-xl h-14 text-lg font-bold"
          onClick={handleGenerate}
          disabled={isGenerating || !ingredients?.length}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating Recipes...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Recipe Ideas
            </>
          )}
        </Button>

        {/* Recipe Results */}
        {hasGenerated && recipes.length === 0 && !isGenerating && (
          <div className="text-center py-8 text-muted-foreground">
            No recipes could be generated. Try a different style or add more
            ingredients.
          </div>
        )}

        {recipes.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Suggested Recipes</h3>
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{recipe.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveRecipe(recipe)}
                      disabled={isSaving}
                    >
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    {recipe.description}
                  </p>

                  {/* Meta badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs">
                      <Clock className="w-3 h-3" />
                      {recipe.prepTime + recipe.cookTime} min
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs capitalize">
                      {recipe.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs">
                      {recipe.servings} servings
                    </span>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-2 p-3 bg-secondary/50 rounded-xl">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">
                        {recipe.macros.calories}
                      </div>
                      <div className="text-xs text-muted-foreground">cal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.macros.protein}g
                      </div>
                      <div className="text-xs text-muted-foreground">
                        protein
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.macros.carbs}g
                      </div>
                      <div className="text-xs text-muted-foreground">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.macros.fat}g
                      </div>
                      <div className="text-xs text-muted-foreground">fat</div>
                    </div>
                  </div>

                  {/* Ingredients Preview */}
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2">Ingredients</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {recipe.ingredients.slice(0, 5).map((ing, i) => (
                        <li key={i}>• {ing}</li>
                      ))}
                      {recipe.ingredients.length > 5 && (
                        <li className="text-primary">
                          +{recipe.ingredients.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Instructions Preview */}
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2">Instructions</h5>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      {recipe.instructions.slice(0, 3).map((step, i) => (
                        <li key={i} className="truncate">
                          {step}
                        </li>
                      ))}
                      {recipe.instructions.length > 3 && (
                        <li className="text-primary list-none">
                          +{recipe.instructions.length - 3} more steps
                        </li>
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved Recipes Link */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/nutrition/recipes/saved")}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            View Saved Recipes
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
