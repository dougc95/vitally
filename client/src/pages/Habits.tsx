import { useHabits, useToggleHabitEntry } from "@/hooks/use-habits";
import { HabitCard } from "@/components/habits";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Habits() {
  const { data: habits, isLoading, error } = useHabits();
  const toggleEntry = useToggleHabitEntry();
  const { toast } = useToast();
  const today = new Date();

  const handleToggle = (habitId: number, date: string) => {
    toggleEntry.mutate(
      { habitId, date },
      {
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
    <PageLayout title="Habits">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
              {format(today, "EEEE")}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {format(today, "MMMM d")}
            </h1>
          </div>
          <Link href="/habits/new">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Habit
            </Button>
          </Link>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">
            Failed to load habits. Please try again.
          </div>
        ) : habits && habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🌱</span>
            </div>
            <h3 className="text-xl font-bold">No habits yet</h3>
            <p className="text-muted-foreground max-w-[250px]">
              Start small. Create your first habit to begin tracking your
              progress.
            </p>
            <Link href="/habits/new">
              <Button className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Habit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {habits?.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={handleToggle}
                isToggling={toggleEntry.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
