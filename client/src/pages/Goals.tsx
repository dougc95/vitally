import { useState } from "react";
import { useBootstrap, useGoalProgress, useUpsertGoal } from "@/hooks/use-metrics";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Goals() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { data: progress, isLoading } = useGoalProgress(selectedMonth);
  const { data: bootstrap } = useBootstrap();

  if (isLoading) {
    return (
      <PageLayout title="Goals">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  const getStatusBadge = (status: string, delta: number | null) => {
    switch(status) {
      case "on-track":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shadow-none border-emerald-200 dark:border-emerald-800">On Track</Badge>;
      case "off-track":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 shadow-none border-amber-200 dark:border-amber-800">Off Track</Badge>;
      case "no-target":
        return <Badge variant="outline" className="text-muted-foreground">No Target</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground/60">No Data</Badge>;
    }
  };

  const getDeltaDisplay = (delta: number | null, unit: string) => {
    if (delta === null) return "-";
    const sign = delta > 0 ? "+" : "";
    const color = delta === 0 ? "text-muted-foreground/60" : "text-muted-foreground";
    return <span className={cn("font-mono text-xs", color)}>{sign}{delta.toFixed(1)} {unit}</span>;
  };

  return (
    <PageLayout 
      title="Monthly Goals" 
      subtitle={`Targets for ${format(new Date(selectedMonth), "MMMM yyyy")}`}
      actions={
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Pencil className="w-4 h-4" />
              Edit Targets
            </Button>
          </DialogTrigger>
          <EditGoalsDialog 
            month={selectedMonth} 
            existingTargets={progress} 
            metrics={bootstrap?.metrics || []}
            onClose={() => setIsEditDialogOpen(false)}
          />
        </Dialog>
      }
    >
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30%] text-muted-foreground">Metric</TableHead>
              <TableHead className="text-muted-foreground">Target</TableHead>
              <TableHead className="text-muted-foreground">Current</TableHead>
              <TableHead className="text-muted-foreground">Gap</TableHead>
              <TableHead className="text-right text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {progress?.map((row) => (
              <TableRow key={row.metricCode} className="hover:bg-muted/50 border-border">
                <TableCell className="font-medium text-foreground">
                  {row.metricName}
                </TableCell>
                <TableCell>
                  {row.targetValue !== null ? (
                    <span className="font-medium font-mono text-foreground/80">
                      {row.targetValue} <span className="text-xs text-muted-foreground/60">{row.unit}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell>
                   {row.currentValue !== null ? (
                    <span className="font-medium font-mono text-foreground">
                      {row.currentValue} <span className="text-xs text-muted-foreground/60">{row.unit}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getDeltaDisplay(row.delta, row.unit)}
                </TableCell>
                <TableCell className="text-right">
                  {getStatusBadge(row.status, row.delta)}
                </TableCell>
              </TableRow>
            ))}
            {progress?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No goals set for this month. Click "Edit Targets" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
}

function EditGoalsDialog({ month, existingTargets, metrics, onClose }: any) {
  const { toast } = useToast();
  const upsertMutation = useUpsertGoal();
  
  // Pre-fill form state
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    existingTargets?.forEach((t: any) => {
      if (t.targetValue !== null) initial[t.metricCode] = String(t.targetValue);
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetPayload = Object.entries(targets)
      .filter(([_, val]) => val !== "")
      .map(([code, val]) => ({
        metricCode: code,
        targetValue: parseFloat(val),
        direction: "maintain" as const, // Simple default for now
      }));

    upsertMutation.mutate(
      { month, targets: targetPayload },
      {
        onSuccess: () => {
          toast({ title: "Goals updated successfully" });
          onClose();
        }
      }
    );
  };

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Set Targets for {format(new Date(month), "MMMM")}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {metrics.filter((m: any) => m.kind !== 'derived').map((metric: any) => (
          <div key={metric.code} className="grid grid-cols-3 gap-4 items-center">
            <label htmlFor={`target-${metric.code}`} className="text-sm font-medium text-foreground/80 col-span-1">
              {metric.displayName}
            </label>
            <div className="col-span-2 relative">
              <Input
                id={`target-${metric.code}`}
                type="number"
                step="0.1"
                placeholder="No target"
                value={targets[metric.code] || ""}
                onChange={(e) => setTargets(prev => ({ ...prev, [metric.code]: e.target.value }))}
                className="pr-12 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {metric.unit}
              </span>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={upsertMutation.isPending} className="bg-primary text-primary-foreground">
            {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
