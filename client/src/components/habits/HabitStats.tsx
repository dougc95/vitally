import { motion } from "framer-motion";

interface HabitStatsProps {
  totalCompleted: number;
  completionRate: number;
  color: string;
}

export function HabitStats({
  totalCompleted,
  completionRate,
  color,
}: HabitStatsProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Stats Overview</h3>
          <p className="text-sm text-muted-foreground">Performance metrics</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black" style={{ color }}>
            {completionRate}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Accuracy
          </div>
        </div>
      </div>

      <div className="flex justify-center py-4 relative">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 border border-border/50 rounded-full" />
          <div className="absolute inset-4 border border-border/50 rounded-full" />
          <div className="absolute inset-8 border border-border/50 rounded-full" />
          <div className="absolute h-full w-[1px] bg-border/50" />
          <div className="absolute w-full h-[1px] bg-border/50" />

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute w-32 h-32 opacity-20 rounded-full"
            style={{ backgroundColor: color }}
          />

          <div className="z-10 text-center">
            <div className="text-2xl font-black">{totalCompleted}</div>
            <div className="text-[10px] font-bold uppercase tracking-tighter">
              Days
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-secondary/50 p-4 rounded-xl">
          <div className="text-sm font-bold">Consistency</div>
          <div className="text-xs text-muted-foreground">
            {completionRate >= 70
              ? "High Growth"
              : completionRate >= 40
              ? "Moderate"
              : "Building"}
          </div>
        </div>
        <div className="bg-secondary/50 p-4 rounded-xl">
          <div className="text-sm font-bold">Persistence</div>
          <div className="text-xs text-muted-foreground">
            {totalCompleted >= 30
              ? "Strong Finish"
              : totalCompleted >= 10
              ? "Getting There"
              : "Just Started"}
          </div>
        </div>
      </div>
    </div>
  );
}
