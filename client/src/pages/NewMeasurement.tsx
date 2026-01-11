import { useState } from "react";
import { useLocation } from "wouter";
import { useBootstrap, useCreateMeasurement } from "@/hooks/use-metrics";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Save, Ruler, Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function NewMeasurement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: bootstrap, isLoading: isBootstrapLoading, isError: isBootstrapError } = useBootstrap();
  const createMutation = useCreateMeasurement();

  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, string>>({}); // Keep as strings for input handling

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert string inputs to numbers
    const metrics: Record<string, number> = {};
    Object.entries(values).forEach(([code, val]) => {
      if (val.trim() !== "") {
        metrics[code] = parseFloat(val);
      }
    });

    if (Object.keys(metrics).length === 0) {
      toast({
        title: "No data entered",
        description: "Please enter at least one measurement value.",
        variant: "destructive"
      });
      return;
    }

    createMutation.mutate(
      {
        date: format(date, "yyyy-MM-dd"),
        note: note || undefined,
        metrics,
      },
      {
        onSuccess: () => {
          toast({
            title: "Recorded successfully",
            description: "Your measurements have been saved.",
          });
          navigate("/");
        },
      }
    );
  };

  const handleValueChange = (code: string, val: string) => {
    setValues(prev => ({ ...prev, [code]: val }));
  };

  if (isBootstrapLoading) {
    return (
      <PageLayout title="New Measurement">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (isBootstrapError) {
    return (
      <PageLayout title="New Measurement">
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <p className="text-destructive font-medium">Failed to load metrics configuration.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Group metrics by kind
  const metricsByKind = bootstrap?.metrics.reduce((acc, metric) => {
    if (metric.kind === 'derived') return acc; // Don't show inputs for derived metrics
    if (!acc[metric.kind]) acc[metric.kind] = [];
    acc[metric.kind].push(metric);
    return acc;
  }, {} as Record<string, typeof bootstrap.metrics>) || {};

  return (
    <PageLayout 
      title="New Measurement" 
      subtitle="Record your body metrics for today"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
        {/* Date & Note Section */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-12",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea 
                id="note" 
                placeholder="Morning measurement, fasting..." 
                className="h-12 min-h-[3rem] resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Metric Groups */}
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(metricsByKind).map(([kind, metrics]) => (
            <Card key={kind} className="border-border/60 shadow-sm overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                {kind === 'weight' ? <Weight className="w-4 h-4 text-primary" /> : <Ruler className="w-4 h-4 text-primary" />}
                <h3 className="font-semibold text-foreground capitalize">{kind} Metrics</h3>
              </div>
              <CardContent className="p-6 space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.code} className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor={metric.code} className="text-muted-foreground font-normal">
                      {metric.displayName}
                    </Label>
                    <div className="relative">
                      <Input
                        id={metric.code}
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="pr-12 text-right font-mono"
                        value={values[metric.code] || ""}
                        onChange={(e) => handleValueChange(metric.code, e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                        {metric.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full sm:w-auto px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Record
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
