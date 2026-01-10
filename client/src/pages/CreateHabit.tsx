import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateHabit } from "@/hooks/use-habits";
import { HABIT_COLORS } from "@shared/schema";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function CreateHabit() {
  const [, setLocation] = useLocation();
  const createHabit = useCreateHabit();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(
    HABIT_COLORS[0].value
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createHabit.mutate(
      { title: title.trim(), color: selectedColor },
      {
        onSuccess: () => {
          toast({
            title: "Habit created",
            description: "Your new habit has been created successfully.",
          });
          setLocation("/habits");
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
    <PageLayout title="New Habit">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/habits")}
            className="p-2 -ml-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">New Habit</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Habit Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 10 pages"
              className="w-full text-xl font-semibold bg-transparent border-b-2 border-border focus:border-primary focus:outline-none py-2 placeholder:text-muted-foreground/30 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Color
            </label>
            <div className="flex flex-wrap gap-3">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "w-10 h-10 rounded-full transition-transform hover:scale-110 focus:outline-none ring-offset-2 ring-offset-background",
                    selectedColor === color.value
                      ? "ring-2 ring-foreground scale-110"
                      : ""
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!title.trim() || createHabit.isPending}
            className="w-full py-6 text-base font-semibold"
          >
            {createHabit.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Habit"
            )}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
