import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useHabit,
  useDeleteHabit,
  useToggleHabitEntry,
} from "@/hooks/use-habits";
import { HabitCalendar, HabitStats } from "@/components/habits";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  Trash2,
  Loader2,
  Plus,
  Calendar,
  History,
  Info,
  Check,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type TimeRange = "7d" | "1m" | "90d" | "year";

export default function HabitDetail() {
  const [match, params] = useRoute("/habits/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  const [customDate, setCustomDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const habitId = match && params?.id ? parseInt(params.id, 10) : undefined;
  const { data: habit, isLoading, error } = useHabit(habitId);
  const deleteHabit = useDeleteHabit();
  const toggleEntry = useToggleHabitEntry();

  if (!match || !habitId) {
    return (
      <PageLayout title="Habit">
        <div className="text-center py-20">Invalid habit ID</div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Habit">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !habit) {
    return (
      <PageLayout title="Habit">
        <div className="text-center py-20 text-destructive">
          Habit not found
        </div>
      </PageLayout>
    );
  }

  const handleDelete = () => {
    deleteHabit.mutate(habitId, {
      onSuccess: () => {
        toast({ title: "Habit deleted" });
        setLocation("/habits");
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

  const handleAddCustom = () => {
    toggleEntry.mutate(
      { habitId, date: customDate },
      {
        onSuccess: () => {
          setIsAddingCustom(false);
          toast({ title: "Entry logged" });
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

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const isTodayCompleted = habit.completedDates.includes(todayStr);
  const totalCompleted = habit.completedDates.length;
  const daysSinceStart = Math.max(
    1,
    Math.floor(
      (today.getTime() - new Date(habit.startDate).getTime()) /
        (1000 * 3600 * 24)
    ) + 1
  );
  const completionRate = Math.round((totalCompleted / daysSinceStart) * 100);

  const handleToggleToday = () => {
    toggleEntry.mutate(
      { habitId, date: todayStr },
      {
        onSuccess: (result) => {
          toast({ title: result.completed ? "Marked complete!" : "Unmarked" });
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
    <PageLayout title={habit.title}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/habits")}
              className="p-2 -ml-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <header>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
            {habit.title}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <span>
              Tracked since {format(parseISO(habit.startDate), "MMM d, yyyy")}
            </span>
          </div>
        </header>

        {/* Complete Today Button */}
        <motion.button
          onClick={handleToggleToday}
          disabled={toggleEntry.isPending}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50",
            isTodayCompleted
              ? "bg-primary text-primary-foreground shadow-primary/30"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
        >
          {toggleEntry.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isTodayCompleted ? (
            <>
              <Check className="w-5 h-5" />
              Completed Today
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Mark Today Complete
            </>
          )}
        </motion.button>

        {/* Activity Graph */}
        <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 overflow-hidden">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">
                Activity Graph
              </h3>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      View Range
                    </DropdownMenuLabel>
                    {(["7d", "1m", "90d", "year"] as TimeRange[]).map(
                      (range) => (
                        <DropdownMenuItem
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            timeRange === range &&
                              "bg-primary text-primary-foreground"
                          )}
                        >
                          <Calendar className="w-4 h-4 opacity-70" />
                          <span className="font-medium text-sm">
                            {range === "7d"
                              ? "Last 7 Days"
                              : range === "1m"
                              ? "Last Month"
                              : range === "90d"
                              ? "Last 90 Days"
                              : "Full Year"}
                          </span>
                        </DropdownMenuItem>
                      )
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Log Activity
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => setIsAddingCustom(true)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <History className="w-4 h-4 opacity-70" />
                      <span className="font-medium text-sm">Log Past Date</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-secondary/30 px-2 py-1.5 rounded-lg">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-muted" />
                    <div
                      className="w-2.5 h-2.5 rounded-sm opacity-60"
                      style={{ backgroundColor: habit.color }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: habit.color }}
                    />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isAddingCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 bg-secondary/50 p-3 rounded-xl border border-border/50">
                    <div className="flex-1 flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 ml-1">
                        Log Date
                      </span>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 p-0"
                        max={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddCustom}
                        disabled={toggleEntry.isPending}
                        className="h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {toggleEntry.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setIsAddingCustom(false)}
                        className="h-9 w-9 flex items-center justify-center bg-muted text-muted-foreground rounded-lg active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <HabitCalendar
            completedDates={habit.completedDates}
            color={habit.color}
            timeRange={timeRange}
          />

          <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5 font-medium">
            <Info className="w-3 h-3" />
            {timeRange === "year"
              ? `Showing contributions for ${format(today, "yyyy")}`
              : `Showing activity for the last ${
                  timeRange === "7d"
                    ? "7 days"
                    : timeRange === "1m"
                    ? "month"
                    : "90 days"
                }`}
          </p>
        </section>

        {/* Stats */}
        <HabitStats
          totalCompleted={totalCompleted}
          completionRate={completionRate}
          color={habit.color}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete habit?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{habit.title}" and all its
                entries. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteHabit.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
}
