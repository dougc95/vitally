import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface MacroChartProps {
  protein: number;
  fat: number;
  carbs: number;
}

export function MacroChart({ protein, fat, carbs }: MacroChartProps) {
  const data = [
    { name: "Protein", value: protein, color: "#0ea5e9" }, // sky-500
    { name: "Carbs", value: carbs, color: "#f97316" }, // orange-500
    { name: "Fat", value: fat, color: "#eab308" }, // yellow-500
  ];

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground text-center uppercase tracking-wider">
          Macro Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              itemStyle={{ fontWeight: 600 }}
              formatter={(value: number) => [`${value}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="block text-xs text-muted-foreground">Split</span>
          </div>
        </div>
      </CardContent>

      <div className="flex justify-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Protein</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Carbs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Fat</span>
        </div>
      </div>
    </Card>
  );
}
