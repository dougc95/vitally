import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import type { HabitWithEntries, Habit } from "@shared/schema";

type CreateHabitInput = z.infer<typeof api.habits.create.input>;
type UpdateHabitInput = z.infer<typeof api.habits.update.input>;
type ToggleEntryInput = z.infer<typeof api.habits.toggleEntry.input>;

export function useHabits() {
  return useQuery<HabitWithEntries[]>({
    queryKey: [api.habits.list.path],
    queryFn: async () => {
      const res = await fetch(api.habits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch habits");
      return res.json();
    },
  });
}

export function useHabit(habitId: number | undefined) {
  return useQuery<HabitWithEntries>({
    queryKey: [api.habits.get.path, habitId],
    enabled: !!habitId,
    queryFn: async () => {
      const url = buildUrl(api.habits.get.path, { id: habitId! });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Habit not found");
        throw new Error("Failed to fetch habit");
      }
      return res.json();
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation<Habit, Error, CreateHabitInput>({
    mutationFn: async (data) => {
      const res = await fetch(api.habits.create.path, {
        method: api.habits.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create habit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation<Habit, Error, { habitId: number; data: UpdateHabitInput }>(
    {
      mutationFn: async ({ habitId, data }) => {
        const url = buildUrl(api.habits.update.path, { id: habitId });
        const res = await fetch(url, {
          method: api.habits.update.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update habit");
        }
        return res.json();
      },
      onSuccess: (_, { habitId }) => {
        queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
        queryClient.invalidateQueries({
          queryKey: [api.habits.get.path, habitId],
        });
      },
    }
  );
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (habitId) => {
      const url = buildUrl(api.habits.delete.path, { id: habitId });
      const res = await fetch(url, {
        method: api.habits.delete.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete habit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
    },
  });
}

export function useToggleHabitEntry() {
  const queryClient = useQueryClient();
  return useMutation<
    { completed: boolean },
    Error,
    { habitId: number; date: string }
  >({
    mutationFn: async ({ habitId, date }) => {
      const url = buildUrl(api.habits.toggleEntry.path, { id: habitId });
      const res = await fetch(url, {
        method: api.habits.toggleEntry.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to toggle habit entry");
      }
      return res.json();
    },
    onSuccess: (_, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      queryClient.invalidateQueries({
        queryKey: [api.habits.get.path, habitId],
      });
    },
  });
}
