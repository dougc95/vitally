import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Types from schema/routes
type CreateMeasurementInput = z.infer<typeof api.measurements.create.input>;
type UpsertGoalInput = z.infer<typeof api.goals.upsert.input>;

export function useBootstrap() {
  return useQuery({
    queryKey: [api.bootstrap.get.path],
    queryFn: async () => {
      const res = await fetch(api.bootstrap.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bootstrap data");
      return api.bootstrap.get.responses[200].parse(await res.json());
    },
  });
}

export function useLatestMeasurement(patientId?: string) {
  return useQuery({
    queryKey: [api.measurements.latest.path, patientId],
    queryFn: async () => {
      const url = patientId 
        ? buildUrl(api.measurements.latest.path) + `?patientId=${patientId}`
        : api.measurements.latest.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch latest measurement");
      
      const data = await res.json();
      return api.measurements.latest.responses[200].parse(data);
    },
  });
}

export function useMeasurementHistory(from?: string, to?: string) {
  return useQuery({
    queryKey: [api.measurements.list.path, from, to],
    queryFn: async () => {
      let url = api.measurements.list.path;
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.measurements.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMeasurementInput) => {
      // Ensure numeric values are numbers (zod coerce handles this but being explicit helps)
      const res = await fetch(api.measurements.create.path, {
        method: api.measurements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.measurements.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to record measurement");
      }
      return api.measurements.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.measurements.latest.path] });
      queryClient.invalidateQueries({ queryKey: [api.measurements.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.metrics.timeseries.path] });
      queryClient.invalidateQueries({ queryKey: [api.goals.progress.path] });
    },
  });
}

export function useMetricTimeseries(code: string, from?: string, to?: string) {
  return useQuery({
    queryKey: [api.metrics.timeseries.path, code, from, to],
    enabled: !!code,
    queryFn: async () => {
      let url = buildUrl(api.metrics.timeseries.path, { code });
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch timeseries");
      }
      return api.metrics.timeseries.responses[200].parse(await res.json());
    },
  });
}

export function useGoalProgress(month: string) {
  return useQuery({
    queryKey: [api.goals.progress.path, month],
    enabled: !!month,
    queryFn: async () => {
      const url = `${api.goals.progress.path}?month=${month}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch goal progress");
      return api.goals.progress.responses[200].parse(await res.json());
    },
  });
}

export function useUpsertGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpsertGoalInput) => {
      const res = await fetch(api.goals.upsert.path, {
        method: api.goals.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.goals.upsert.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to save goals");
      }
      return api.goals.upsert.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.goals.progress.path] });
      queryClient.invalidateQueries({ queryKey: [api.goals.get.path] });
      // Also invalidate for the specific month updated
      queryClient.invalidateQueries({ queryKey: [api.goals.progress.path, variables.month] });
    },
  });
}

export function useGoal(month: string) {
  return useQuery({
    queryKey: [api.goals.get.path, month],
    enabled: !!month,
    queryFn: async () => {
      const url = `${api.goals.get.path}?month=${month}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch goal");
      return api.goals.get.responses[200].parse(await res.json());
    },
  });
}
