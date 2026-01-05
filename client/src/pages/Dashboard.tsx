import { useLatestMeasurement, useBootstrap } from "@/hooks/use-metrics";
import { PageLayout } from "@/components/PageLayout";
import { MetricCard } from "@/components/MetricCard";
import { QuickAction } from "@/components/QuickAction";
import { PlusCircle, Target, TrendingUp, History } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDialog } from "@/components/export/ExportDialog";

export default function Dashboard() {
  const { data: latest, isLoading: isLoadingLatest } = useLatestMeasurement();
  const { data: bootstrap, isLoading: isLoadingBootstrap } = useBootstrap();

  if (isLoadingLatest || isLoadingBootstrap) {
    return <DashboardSkeleton />;
  }

  // Find key metrics to display on cards
  const weight = latest?.components.find((c: any) => c.metricCode === "weight");
  const bodyFat = latest?.components.find(
    (c: any) => c.metricCode === "body-fat"
  );
  const waist = latest?.components.find((c: any) => c.metricCode === "waist");
  const bmi = latest?.components.find((c: any) => c.metricCode === "bmi");

  const formattedDate = latest
    ? format(new Date(latest.effectiveAt), "MMMM do, yyyy")
    : "No records yet";

  return (
    <PageLayout
      title={`Welcome back, ${bootstrap?.patient.displayName || "User"}`}
      subtitle={`Last update: ${formattedDate}`}
      actions={<ExportDialog />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <QuickAction
          title="Log Measurement"
          description="Record weight, body fat, or measurements"
          icon={PlusCircle}
          href="/measurements/new"
          variant="primary"
        />
        <QuickAction
          title="Set Goals"
          description="Update your targets for this month"
          icon={Target}
          href="/goals"
          variant="secondary"
        />
        <QuickAction
          title="View Trends"
          description="Analyze your progress over time"
          icon={TrendingUp}
          href="/metrics"
          variant="secondary"
        />
      </div>

      <h2 className="text-xl font-display font-bold text-slate-900 mb-6">
        Latest Vitals
      </h2>

      {latest ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Weight"
            value={weight?.value || "-"}
            unit={weight?.unit || "kg"}
            trend={weight ? "flat" : undefined} // TODO: calculate real trend
            trendValue="0.0"
            color="primary"
          />
          <MetricCard
            title="Body Fat"
            value={bodyFat?.value || "-"}
            unit={bodyFat?.unit || "%"}
          />
          <MetricCard
            title="BMI"
            value={bmi?.value || "-"}
            unit={bmi?.unit || "kg/m²"}
          />
          <MetricCard
            title="Waist"
            value={waist?.value || "-"}
            unit={waist?.unit || "cm"}
          />
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No Data Yet
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Start tracking your health journey by logging your first
            measurement.
          </p>
        </div>
      )}

      {/* Recent History Preview */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-slate-900">
            Recent History
          </h2>
          {/* Link to full history could go here */}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-sm font-medium text-slate-500">
              <div>Date</div>
              <div>Weight</div>
              <div className="hidden sm:block">Body Fat</div>
              <div className="text-right">Note</div>
            </div>
          </div>
          {latest ? (
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 items-center text-sm">
                <div className="font-medium text-slate-900">
                  {format(new Date(latest.effectiveAt), "MMM d, yyyy")}
                </div>
                <div className="text-slate-600">
                  {weight?.value ?? "-"}{" "}
                  <span className="text-xs text-slate-400">{weight?.unit}</span>
                </div>
                <div className="hidden sm:block text-slate-600">
                  {bodyFat?.value ?? "-"}{" "}
                  <span className="text-xs text-slate-400">
                    {bodyFat?.unit}
                  </span>
                </div>
                <div className="text-right text-slate-400 truncate">
                  {latest.note || "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No history available
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function DashboardSkeleton() {
  return (
    <PageLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </PageLayout>
  );
}
