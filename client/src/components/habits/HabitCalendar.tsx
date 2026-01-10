import {
  format,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  subDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type TimeRange = "7d" | "1m" | "90d" | "year";

interface HabitCalendarProps {
  completedDates: string[];
  color: string;
  timeRange: TimeRange;
}

export function HabitCalendar({
  completedDates,
  color,
  timeRange,
}: HabitCalendarProps) {
  const today = new Date();

  let startDate: Date;
  switch (timeRange) {
    case "7d":
      startDate = subDays(today, 6);
      break;
    case "1m":
      startDate = subDays(today, 30);
      break;
    case "90d":
      startDate = subDays(today, 89);
      break;
    case "year":
      startDate = startOfYear(today);
      break;
  }

  const endDate = timeRange === "year" ? endOfYear(today) : today;
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
      <motion.div
        layout
        className="flex flex-col flex-wrap h-28 gap-1 content-start"
      >
        <AnimatePresence mode="popLayout">
          {allDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isCompleted = completedDates.includes(dateStr);
            const isFuture = day > today;

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                title={dateStr}
                className={cn(
                  "w-3 h-3 rounded-sm transition-colors duration-500 shrink-0",
                  isFuture ? "bg-muted/10" : isCompleted ? "" : "bg-muted"
                )}
                style={{
                  backgroundColor: !isFuture && isCompleted ? color : undefined,
                  opacity: !isFuture && isCompleted ? 1 : undefined,
                }}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
