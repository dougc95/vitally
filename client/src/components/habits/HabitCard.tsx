import { HabitWithEntries } from "@shared/schema";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";

interface HabitCardProps {
  habit: HabitWithEntries;
  onToggle: (habitId: number, date: string) => void;
  isToggling?: boolean;
}

export function HabitCard({ habit, onToggle, isToggling }: HabitCardProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isCompleted = habit.completedDates.includes(today);

  // Calculate streak
  let streak = 0;
  const sortedDates = [...habit.completedDates].sort().reverse();
  const todayDate = new Date();

  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(todayDate);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = format(checkDate, "yyyy-MM-dd");

    if (sortedDates.includes(checkDateStr)) {
      streak++;
    } else if (i === 0 && !isCompleted) {
      // If today isn't completed, start checking from yesterday
      continue;
    } else {
      break;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm transition-all hover:shadow-md"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-opacity"
        style={{ backgroundColor: habit.color }}
      />

      <div className="p-4 pl-6 flex items-center justify-between gap-4">
        <Link href={`/habits/${habit.id}`}>
          <a className="flex-1 cursor-pointer">
            <h3 className="font-semibold text-base text-foreground leading-tight mb-1">
              {habit.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  streak > 0 ? "text-orange-500" : ""
                )}
              >
                🔥 {streak} day streak
              </span>
            </div>
          </a>
        </Link>

        <button
          onClick={() => onToggle(habit.id, today)}
          disabled={isToggling}
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-50",
            isCompleted
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              : "bg-secondary text-muted-foreground/30 hover:bg-secondary/80"
          )}
        >
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check strokeWidth={3} className="w-5 h-5" />
            </motion.div>
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-current opacity-50" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
