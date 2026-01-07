import { type CalculationResult } from "@/lib/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MacroChart } from "./MacroChart";
import { Copy, Activity, Flame, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ResultsDisplayProps {
  results: CalculationResult;
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const { toast } = useToast();

  const copyToClipboard = () => {
    const text = `
Macro Calculation Results:
-------------------------
TDEE: ${results.tdee} kcal
Goal: ${results.goalCalories} kcal

Macros:
Protein: ${results.macros.protein.g}g (${results.macros.protein.pct}%)
Carbs: ${results.macros.carbs.g}g (${results.macros.carbs.pct}%)
Fat: ${results.macros.fat.g}g (${results.macros.fat.pct}%)
    `.trim();

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Results copied to clipboard.",
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Activity className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Maintenance (TDEE)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-foreground">
                {results.tdee}{" "}
                <span className="text-lg font-sans font-normal text-muted-foreground">
                  kcal
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on activity factor
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-primary to-primary/80 border-none text-primary-foreground shadow-lg shadow-primary/20 overflow-hidden relative">
            <div className="absolute right-0 top-0 p-4 opacity-20">
              <Flame className="w-16 h-16 text-white" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wider">
                Target Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display font-bold text-white">
                {results.goalCalories}{" "}
                <span className="text-lg font-sans font-normal text-white/80">
                  kcal
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1">
                Daily goal adjusted for target
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-1">
          <MacroChart
            protein={results.macros.protein.pct}
            fat={results.macros.fat.pct}
            carbs={results.macros.carbs.pct}
          />
        </motion.div>

        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                Daily Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50">
                <div className="flex flex-col">
                  <span className="font-bold text-sky-700 dark:text-sky-400">
                    Protein
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {results.macros.protein.pct}% of total
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-foreground">
                    {results.macros.protein.g}g
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {results.macros.protein.kcal} kcal
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50">
                <div className="flex flex-col">
                  <span className="font-bold text-orange-700 dark:text-orange-400">
                    Carbs
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {results.macros.carbs.pct}% of total
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-foreground">
                    {results.macros.carbs.g}g
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {results.macros.carbs.kcal} kcal
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/50">
                <div className="flex flex-col">
                  <span className="font-bold text-yellow-700 dark:text-yellow-400">
                    Fats
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {results.macros.fat.pct}% of total
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-foreground">
                    {results.macros.fat.g}g
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {results.macros.fat.kcal} kcal
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item} className="pt-4 flex justify-center">
        <Button onClick={copyToClipboard} variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy Results
        </Button>
      </motion.div>

      <Separator />

      <motion.div
        variants={item}
        className="text-xs text-muted-foreground grid grid-cols-2 gap-4"
      >
        <div>
          <span className="font-semibold block">Mifflin-St Jeor BMR:</span>
          {results.bmrMifflin} kcal
        </div>
        <div>
          <span className="font-semibold block">Harris-Benedict BMR:</span>
          {results.bmrHarrisBenedict} kcal
        </div>
        <div className="col-span-2">
          <span className="font-semibold block">Average BMR Used:</span>
          {results.bmrAverage} kcal
        </div>
      </motion.div>
    </motion.div>
  );
}
