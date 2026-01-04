import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  trendLabel?: string;
  color?: "default" | "primary" | "success" | "warning";
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendValue, 
  trendLabel = "vs last record",
  color = "default",
  className 
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up": return <ArrowUp className="w-3 h-3" />;
      case "down": return <ArrowDown className="w-3 h-3" />;
      case "flat": return <Minus className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTrendColor = () => {
    // Context-aware coloring could be added here (is up good or bad?)
    // For now defaulting to standard financial-style colors
    switch (trend) {
      case "up": return "text-emerald-600 bg-emerald-50";
      case "down": return "text-rose-600 bg-rose-50";
      default: return "text-slate-500 bg-slate-100";
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300",
      className
    )}>
      <h3 className="text-sm font-medium text-slate-500 mb-4">{title}</h3>
      
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-display text-slate-900 tracking-tight">
          {value}
        </span>
        <span className="text-sm font-medium text-slate-400">{unit}</span>
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-4">
          <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold", getTrendColor())}>
            {getTrendIcon()}
            {trendValue}
          </div>
          <span className="text-xs text-slate-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
