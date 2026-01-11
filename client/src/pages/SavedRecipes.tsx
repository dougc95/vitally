import { useLocation } from "wouter";
import { ArrowLeft, Bookmark, Clock, Loader2, Trash2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useSavedRecipes, useDeleteRecipe } from "@/hooks/use-ingredients";
import { useToast } from "@/hooks/use-toast";

export default function SavedRecipes() {
  const [, setLocation] = useLocation();
  const { data: recipes, isLoading } = useSavedRecipes();
  const { mutate: deleteRecipe } = useDeleteRecipe();
  const { toast } = useToast();

  const handleDelete = (id: number, title: string) => {
    deleteRecipe(id, {
      onSuccess: () => {
        toast({
          title: "Deleted",
          description: `${title} removed from saved recipes`,
        });
      },
    });
  };

  const parseJsonArray = (jsonStr: string): string[] => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <PageLayout
      title="Saved Recipes"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/nutrition/recipes")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!recipes || recipes.length === 0) && (
          <div className="text-center py-12">
            <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">No saved recipes</h3>
            <p className="text-muted-foreground mb-6">
              Generate recipe ideas and save your favorites
            </p>
            <Button onClick={() => setLocation("/nutrition/recipes")}>
              Get Recipe Ideas
            </Button>
          </div>
        )}

        {recipes?.map((recipe) => {
          const ingredients = parseJsonArray(recipe.ingredients);
          const instructions = parseJsonArray(recipe.instructions);

          return (
            <div
              key={recipe.id}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg">{recipe.title}</h4>
                    {recipe.cuisineMode && (
                      <span className="text-xs text-primary capitalize">
                        {recipe.cuisineMode}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(recipe.id, recipe.title)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {recipe.description && (
                  <p className="text-muted-foreground text-sm mb-4">
                    {recipe.description}
                  </p>
                )}

                {/* Meta badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(recipe.prepTime || recipe.cookTime) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs">
                      <Clock className="w-3 h-3" />
                      {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs capitalize">
                      {recipe.difficulty}
                    </span>
                  )}
                  {recipe.servings && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs">
                      {recipe.servings} servings
                    </span>
                  )}
                </div>

                {/* Macros */}
                {(recipe.calories ||
                  recipe.protein ||
                  recipe.carbs ||
                  recipe.fat) && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-secondary/50 rounded-xl mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">
                        {recipe.calories || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">cal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.protein || 0}g
                      </div>
                      <div className="text-xs text-muted-foreground">
                        protein
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.carbs || 0}g
                      </div>
                      <div className="text-xs text-muted-foreground">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {recipe.fat || 0}g
                      </div>
                      <div className="text-xs text-muted-foreground">fat</div>
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                {ingredients.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm mb-2">Ingredients</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {ingredients.map((ing, i) => (
                        <li key={i}>• {ing}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {instructions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Instructions</h5>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      {instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
