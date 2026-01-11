import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import type { MealWithItems } from "@shared/schema";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MealCardProps {
  meal: MealWithItems;
  onDelete: (id: number) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this meal?")) {
      setIsDeleting(true);
      onDelete(meal.id);
    }
  };

  const totalCalories = meal.items.reduce(
    (sum, item) => sum + item.calories,
    0
  );
  const totalProtein = meal.items.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = meal.items.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = meal.items.reduce((sum, item) => sum + item.fat, 0);

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all hover:shadow-md",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {meal.imageUrl && (
          <div className="sm:w-32 h-32 sm:h-auto relative shrink-0">
            <img
              src={meal.imageUrl}
              alt={meal.mealType}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:hidden" />
            <div className="absolute bottom-2 left-3 sm:hidden text-white font-medium capitalize">
              {meal.mealType}
            </div>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 hidden sm:block">
                {meal.mealType} •{" "}
                {format(new Date(meal.createdAt || new Date()), "h:mm a")}
              </div>
              <h3 className="font-bold text-lg text-foreground">
                {meal.items.map((i) => i.name).join(", ")}
              </h3>
            </div>
            <button
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive p-2 -mr-2 -mt-2 rounded-full hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-secondary/50 rounded-xl p-3">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                Cals
              </div>
              <div className="font-mono font-bold text-sm">{totalCalories}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                Pro
              </div>
              <div className="font-mono font-bold text-sm text-blue-500">
                {totalProtein}g
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                Carbs
              </div>
              <div className="font-mono font-bold text-sm text-amber-500">
                {totalCarbs}g
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                Fat
              </div>
              <div className="font-mono font-bold text-sm text-rose-500">
                {totalFat}g
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
