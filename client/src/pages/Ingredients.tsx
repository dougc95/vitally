import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Camera,
  Trash2,
  ChefHat,
  Loader2,
  Package,
  Apple,
  Beef,
  Milk,
  Wheat,
  Snowflake,
  Coffee,
  Sparkles,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useIngredients,
  useAddIngredient,
  useDeleteIngredient,
} from "@/hooks/use-ingredients";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { IngredientCategory } from "@shared/schema";

const CATEGORY_CONFIG: Record<
  IngredientCategory,
  { label: string; icon: typeof Apple; color: string }
> = {
  produce: { label: "Produce", icon: Apple, color: "text-green-500" },
  protein: { label: "Protein", icon: Beef, color: "text-red-500" },
  dairy: { label: "Dairy", icon: Milk, color: "text-blue-400" },
  grains: { label: "Grains", icon: Wheat, color: "text-amber-500" },
  pantry: { label: "Pantry", icon: Package, color: "text-orange-500" },
  spices: { label: "Spices", icon: Sparkles, color: "text-purple-500" },
  frozen: { label: "Frozen", icon: Snowflake, color: "text-cyan-400" },
  beverages: { label: "Beverages", icon: Coffee, color: "text-brown-500" },
  other: { label: "Other", icon: Package, color: "text-gray-500" },
};

export default function Ingredients() {
  const [, setLocation] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: 1,
    unit: "unit",
    category: "other" as IngredientCategory,
  });

  const { data: ingredients, isLoading } = useIngredients();
  const { mutate: addIngredient, isPending: isAdding } = useAddIngredient();
  const { mutate: deleteIngredient } = useDeleteIngredient();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newIngredient.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ingredient name",
        variant: "destructive",
      });
      return;
    }

    addIngredient(newIngredient, {
      onSuccess: () => {
        toast({ title: "Added", description: "Ingredient added to pantry" });
        setNewIngredient({
          name: "",
          quantity: 1,
          unit: "unit",
          category: "other",
        });
        setIsAddOpen(false);
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

  const handleDelete = (id: number, name: string) => {
    deleteIngredient(id, {
      onSuccess: () => {
        toast({ title: "Removed", description: `${name} removed from pantry` });
      },
    });
  };

  const groupedIngredients = ingredients?.reduce((acc, ing) => {
    const cat = (ing.category as IngredientCategory) || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {} as Record<IngredientCategory, typeof ingredients>);

  return (
    <PageLayout
      title="My Pantry"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/nutrition/ingredients/scan")}
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan
          </Button>
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add Ingredient</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input
                    placeholder="e.g., Chicken breast"
                    value={newIngredient.name}
                    onChange={(e) =>
                      setNewIngredient({
                        ...newIngredient,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={newIngredient.quantity}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          quantity: parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Unit
                    </label>
                    <Select
                      value={newIngredient.unit}
                      onValueChange={(v) =>
                        setNewIngredient({ ...newIngredient, unit: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unit">unit</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="tbsp">tbsp</SelectItem>
                        <SelectItem value="tsp">tsp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Category
                  </label>
                  <Select
                    value={newIngredient.category}
                    onValueChange={(v) =>
                      setNewIngredient({
                        ...newIngredient,
                        category: v as IngredientCategory,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={handleAdd}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add to Pantry
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Get Recipe Ideas CTA */}
        <div
          onClick={() => setLocation("/nutrition/recipes")}
          className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 cursor-pointer hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Get Recipe Ideas</h3>
              <p className="text-muted-foreground text-sm">
                {ingredients?.length
                  ? `Use your ${ingredients.length} ingredients to discover recipes`
                  : "Add ingredients to get AI-powered recipe suggestions"}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!ingredients || ingredients.length === 0) && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">Your pantry is empty</h3>
            <p className="text-muted-foreground mb-6">
              Add ingredients manually or scan a photo
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setLocation("/nutrition/ingredients/scan")}
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Photo
              </Button>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        )}

        {/* Grouped Ingredients */}
        {groupedIngredients &&
          Object.entries(groupedIngredients).map(([category, items]) => {
            if (!items?.length) return null;
            const config = CATEGORY_CONFIG[category as IngredientCategory];
            const Icon = config?.icon || Package;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("w-4 h-4", config?.color)} />
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {config?.label || category}
                  </h3>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-2">
                  {items.map((ing) => (
                    <div
                      key={ing.id}
                      className="bg-card border border-border rounded-xl p-4 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium">{ing.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ing.quantity} {ing.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(ing.id, ing.name)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </PageLayout>
  );
}
