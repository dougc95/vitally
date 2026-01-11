import { format } from "date-fns";
import { Link } from "wouter";
import {
  useNutritionGoals,
  useMeals,
  useDeleteMeal,
} from "@/hooks/use-nutrition";
import { MacroRing, MealCard } from "@/components/nutrition";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2, Settings, ChefHat, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Nutrition() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: goals, isLoading: isLoadingGoals } = useNutritionGoals();
  const { data: meals, isLoading: isLoadingMeals } = useMeals(today);
  const deleteMeal = useDeleteMeal();
  const { toast } = useToast();

  const handleDeleteMeal = (mealId: number) => {
    deleteMeal.mutate(mealId, {
      onError: (err) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoadingGoals || isLoadingMeals) {
    return (
      <PageLayout title="Nutrition">
        <div className="space-y-8">
          <Skeleton className="h-12 w-48 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  const totalCalories =
    meals?.reduce(
      (sum, meal) => sum + meal.items.reduce((s, i) => s + i.calories, 0),
      0
    ) || 0;
  const totalProtein =
    meals?.reduce(
      (sum, meal) => sum + meal.items.reduce((s, i) => s + i.protein, 0),
      0
    ) || 0;
  const totalCarbs =
    meals?.reduce(
      (sum, meal) => sum + meal.items.reduce((s, i) => s + i.carbs, 0),
      0
    ) || 0;
  const totalFat =
    meals?.reduce(
      (sum, meal) => sum + meal.items.reduce((s, i) => s + i.fat, 0),
      0
    ) || 0;

  const goalCalories = goals?.calories || 2000;
  const goalProtein = goals?.protein || 150;
  const goalCarbs = goals?.carbs || 200;
  const goalFat = goals?.fat || 65;

  return (
    <PageLayout title="Nutrition">
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
              {format(new Date(), "EEEE")}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {format(new Date(), "MMMM d")}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/nutrition/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Goals
              </Button>
            </Link>
            <Link href="/nutrition/log">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Log Meal
              </Button>
            </Link>
          </div>
        </header>

        <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 justify-items-center">
            <MacroRing
              current={totalCalories}
              target={goalCalories}
              label="Calories"
              color="text-foreground"
              unit=""
              size="lg"
            />
            <MacroRing
              current={totalProtein}
              target={goalProtein}
              label="Protein"
              color="text-blue-500"
              unit="g"
              size="lg"
            />
            <MacroRing
              current={totalCarbs}
              target={goalCarbs}
              label="Carbs"
              color="text-amber-500"
              unit="g"
              size="lg"
            />
            <MacroRing
              current={totalFat}
              target={goalFat}
              label="Fat"
              color="text-rose-500"
              unit="g"
              size="lg"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                Burned
              </div>
              <div className="text-xl font-mono font-medium">--</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                Eaten
              </div>
              <div className="text-xl font-mono font-bold text-primary">
                {totalCalories}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                Remaining
              </div>
              <div className="text-xl font-mono font-bold text-muted-foreground">
                {Math.max(0, goalCalories - totalCalories)}
              </div>
            </div>
          </div>
        </div>

        {/* Pantry & Recipe Ideas Section */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/nutrition/ingredients">
            <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold">My Pantry</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your ingredients
                  </p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/nutrition/recipes">
            <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChefHat className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold">Recipe Ideas</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered suggestions
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Today's Meals</h2>
            {meals?.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No meals logged yet
              </span>
            )}
          </div>

          {meals && meals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary/30 rounded-2xl border-2 border-dashed border-border p-12 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Start Tracking</h3>
              <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                Log your first meal to see your macro breakdown and progress.
              </p>
              <Link href="/nutrition/log">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Log a meal now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
