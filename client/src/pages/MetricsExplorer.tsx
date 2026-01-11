import { useState } from "react";
import { useBootstrap, useMetricTimeseries } from "@/hooks/use-metrics";
import { PageLayout } from "@/components/PageLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format, subMonths } from "date-fns";

export default function MetricsExplorer() {
  const { data: bootstrap, isLoading: isBootstrapLoading } = useBootstrap();
  const [selectedMetric, setSelectedMetric] = useState<string>("weight");
  const [timeRange, setTimeRange] = useState<"1m" | "3m" | "6m" | "1y" | "all">("3m");

  const fromDate = (() => {
    const now = new Date();
    switch (timeRange) {
      case "1m": return format(subMonths(now, 1), "yyyy-MM-dd");
      case "3m": return format(subMonths(now, 3), "yyyy-MM-dd");
      case "6m": return format(subMonths(now, 6), "yyyy-MM-dd");
      case "1y": return format(subMonths(now, 12), "yyyy-MM-dd");
      default: return undefined;
    }
  })();

  const { data: timeseries, isLoading: isTimeseriesLoading } = useMetricTimeseries(
    selectedMetric, 
    fromDate
  );

  const metricInfo = bootstrap?.metrics.find(m => m.code === selectedMetric);

  return (
    <PageLayout 
      title="Analytics" 
      subtitle="Visualize your progress over time"
    >
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="w-full sm:w-[280px]">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {bootstrap?.metrics.map((m) => (
                <SelectItem key={m.code} value={m.code}>
                  {m.displayName} ({m.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
          {["1m", "3m", "6m", "1y", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeRange === range 
                  ? "bg-card text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-6 h-[400px] border-border/50 shadow-sm relative overflow-hidden">
        {isTimeseriesLoading || isBootstrapLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : timeseries && timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), "MMM d")}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-10}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderRadius: '12px', 
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
                labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
            <LineChart className="w-12 h-12 mb-2 opacity-20" />
            <p>No data available for this time range</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatsCard 
          label="Current" 
          value={timeseries && timeseries.length > 0 ? timeseries[timeseries.length - 1].value : "-"} 
          unit={metricInfo?.unit} 
        />
        <StatsCard 
          label="Average (Period)" 
          value={timeseries && timeseries.length > 0 
            ? (timeseries.reduce((a, b) => a + b.value, 0) / timeseries.length).toFixed(1) 
            : "-"} 
          unit={metricInfo?.unit} 
        />
        <StatsCard 
          label="Starting" 
          value={timeseries && timeseries.length > 0 ? timeseries[0].value : "-"} 
          unit={metricInfo?.unit} 
        />
      </div>
    </PageLayout>
  );
}

function StatsCard({ label, value, unit }: { label: string, value: string | number, unit?: string }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground font-display">{value}</span>
        <span className="text-xs text-muted-foreground/60 font-medium">{unit}</span>
      </div>
    </div>
  );
}
