import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNutritionGoals, useUpdateNutritionGoals } from "@/hooks/use-nutrition";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionSettings() {
  const [, setLocation] = useLocation();
  const { data: goals, isLoading } = useNutritionGoals();
  const { mutate: updateGoals, isPending } = useUpdateNutritionGoals();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  });

  // Sync form with loaded goals
  useEffect(() => {
    if (goals) {
      setFormData({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
      });
    }
  }, [goals]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSave = () => {
    updateGoals(formData, {
      onSuccess: () => {
        toast({
          title: "Goals Updated",
          description: "Your nutrition goals have been saved.",
        });
        setLocation("/nutrition");
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <PageLayout title="Nutrition Goals">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Nutrition Goals"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setLocation("/nutrition")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      }
    >
      <div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <p className="text-muted-foreground text-sm">
            Set your daily macro targets. These will be used to track your progress.
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="calories" className="text-base font-semibold">
                Daily Calories
              </Label>
              <Input
                id="calories"
                type="number"
                min={500}
                max={10000}
                value={formData.calories}
                onChange={(e) => handleChange("calories", e.target.value)}
                className="text-lg font-mono h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein" className="text-base font-semibold">
                Protein (g)
              </Label>
              <Input
                id="protein"
                type="number"
                min={0}
                max={500}
                value={formData.protein}
                onChange={(e) => handleChange("protein", e.target.value)}
                className="text-lg font-mono h-12"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 0.7-1g per lb of body weight
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carbs" className="text-base font-semibold">
                Carbs (g)
              </Label>
              <Input
                id="carbs"
                type="number"
                min={0}
                max={1000}
                value={formData.carbs}
                onChange={(e) => handleChange("carbs", e.target.value)}
                className="text-lg font-mono h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat" className="text-base font-semibold">
                Fat (g)
              </Label>
              <Input
                id="fat"
                type="number"
                min={0}
                max={500}
                value={formData.fat}
                onChange={(e) => handleChange("fat", e.target.value)}
                className="text-lg font-mono h-12"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 0.3-0.5g per lb of body weight
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Goals
              </>
            )}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
