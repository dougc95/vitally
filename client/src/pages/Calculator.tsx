import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  macroCalcInputSchema,
  type MacroCalcInput,
  ACTIVITY_FACTORS,
} from "@shared/schema";
import { calculateMacros, type CalculationResult } from "@/lib/calculator";
import { ResultsDisplay } from "@/components/calculator/ResultsDisplay";
import { useSaveCalculation } from "@/hooks/use-calculations";
import { useLatestMeasurement } from "@/hooks/use-metrics";
import { useBootstrap } from "@/hooks/use-metrics";
import { PageLayout } from "@/components/PageLayout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Activity,
  Dumbbell,
  Scale,
  Ruler,
  Calculator as CalcIcon,
  Save,
} from "lucide-react";

export default function Calculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const saveMutation = useSaveCalculation();
  const { data: latestMeasurement } = useLatestMeasurement();
  const { data: bootstrap } = useBootstrap();

  const defaultValues: MacroCalcInput = {
    name: "My Plan",
    age: 30,
    sex: "male",
    weightKg: 80,
    heightCm: 180,
    bodyFatPct: 15,
    activityLevel: "moderate",
    activityFactor: ACTIVITY_FACTORS.moderate,
    goalType: "maintain",
    goalAdjustmentKcal: 0,
    proteinFactor: 2.0,
    fatGPerKg: 1.0,
    bfThresholdPct: 20,
    useFFMWhenHighBF: true,
    proteinFactorFFM: 2.2,
  };

  const form = useForm<MacroCalcInput>({
    resolver: zodResolver(macroCalcInputSchema),
    defaultValues,
    mode: "onChange",
  });

  const activityLevel = form.watch("activityLevel");
  const goalType = form.watch("goalType");

  useEffect(() => {
    const factor = ACTIVITY_FACTORS[activityLevel];
    form.setValue("activityFactor", factor);
  }, [activityLevel, form]);

  useEffect(() => {
    if (goalType === "cut") form.setValue("goalAdjustmentKcal", -500);
    else if (goalType === "bulk") form.setValue("goalAdjustmentKcal", 500);
    else form.setValue("goalAdjustmentKcal", 0);
  }, [goalType, form]);

  useEffect(() => {
    const saved = localStorage.getItem("macroCalcLastInput");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        form.reset(parsed);
      } catch (e) {
        console.error("Failed to load saved state");
      }
    }
  }, [form]);

  useEffect(() => {
    if (latestMeasurement?.components) {
      const weightComponent = latestMeasurement.components.find(
        (c: any) => c.metricCode === "weight"
      );
      const bodyFatComponent = latestMeasurement.components.find(
        (c: any) => c.metricCode === "body_fat"
      );

      if (weightComponent) {
        form.setValue("weightKg", weightComponent.value);
      }
      if (bodyFatComponent) {
        form.setValue("bodyFatPct", bodyFatComponent.value);
      }
    }
  }, [latestMeasurement, form]);

  useEffect(() => {
    if (bootstrap?.patient?.heightCm) {
      form.setValue("heightCm", bootstrap.patient.heightCm);
    }
  }, [bootstrap, form]);

  function onSubmit(data: MacroCalcInput) {
    const res = calculateMacros(data);
    setResult(res);
    localStorage.setItem("macroCalcLastInput", JSON.stringify(data));
  }

  const handleSaveToHistory = () => {
    if (!result) return;
    const data = form.getValues();
    saveMutation.mutate({
      ...data,
      results: JSON.stringify(result),
    });
  };

  return (
    <PageLayout
      title="Macro Calculator"
      subtitle="Calculate your daily macronutrient targets"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalcIcon className="w-5 h-5" />
                Parameters
              </CardTitle>
              <CardDescription>Enter your biometrics below</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Biometrics
                    </h3>
                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sex</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sex" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weightKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heightCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bodyFatPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Fat %</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.5"
                                className="pr-8"
                                {...field}
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Activity
                    </h3>
                    <Separator />

                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Activity Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select activity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedentary">
                                Sedentary (Office job)
                              </SelectItem>
                              <SelectItem value="light">
                                Light (1-2 days/week)
                              </SelectItem>
                              <SelectItem value="moderate">
                                Moderate (3-5 days/week)
                              </SelectItem>
                              <SelectItem value="high">
                                High (6-7 days/week)
                              </SelectItem>
                              <SelectItem value="very_high">
                                Athlete (2x per day)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Current Factor: {ACTIVITY_FACTORS[activityLevel]}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" /> Goal
                    </h3>
                    <Separator />

                    <FormField
                      control={form.control}
                      name="goalType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-3 gap-2"
                            >
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="cut"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer text-center text-xs">
                                  Cut
                                </FormLabel>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="maintain"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer text-center text-xs">
                                  Maintain
                                </FormLabel>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="bulk"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer text-center text-xs">
                                  Bulk
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="goalAdjustmentKcal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calorie Adjustment</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="50" {...field} />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                kcal
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> Macro Distribution
                    </h3>
                    <Separator />

                    <FormField
                      control={form.control}
                      name="proteinFactor"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between">
                            <FormLabel>Protein (g/kg)</FormLabel>
                            <span className="text-sm text-primary font-bold">
                              {field.value}
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={1.6}
                              max={2.4}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fatGPerKg"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between">
                            <FormLabel>Fat (g/kg)</FormLabel>
                            <span className="text-sm text-primary font-bold">
                              {field.value}
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0.5}
                              max={1.5}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="useFFMWhenHighBF"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Smart Protein
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Use Lean Mass if BF &gt; 20%
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-bold text-lg"
                  >
                    Calculate Macros
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          {result ? (
            <div className="space-y-6">
              <ResultsDisplay results={result} />

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveToHistory}
                  disabled={saveMutation.isPending}
                  variant="secondary"
                  className="gap-2"
                >
                  {saveMutation.isPending ? "Saving..." : "Save to History"}
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
              <CalcIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>Enter your details and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
