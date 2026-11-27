"use client";

import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { WeeklyAvailability } from "@/types/professional";

const defaultAvailability: WeeklyAvailability[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, availableTimes: [] }));

export function useProfessionalAvailability() {
  const [availability, setAvailability] = useState(defaultAvailability);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = useCallback(async () => {
    const saved = await apiRequest<WeeklyAvailability[]>("/professional/availability");
    setAvailability(defaultAvailability.map((day) => ({
      ...day,
      availableTimes: saved.find((item) => item.dayOfWeek === day.dayOfWeek)?.availableTimes ?? [],
    })));
  }, []);

  const toggleTime = useCallback((dayOfWeek: number, time: string) => {
    setAvailability((current) => current.map((day) => day.dayOfWeek !== dayOfWeek ? day : {
      ...day,
      availableTimes: day.availableTimes.includes(time)
        ? day.availableTimes.filter((item) => item !== time)
        : [...day.availableTimes, time].sort(),
    }));
  }, []);

  const saveAvailability = useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      const saved = await apiRequest<WeeklyAvailability[]>("/professional/availability", {
        method: "PUT", body: JSON.stringify({ availability }),
      });
      setAvailability(defaultAvailability.map((day) => ({
        ...day,
        availableTimes: saved.find((item) => item.dayOfWeek === day.dayOfWeek)?.availableTimes ?? [],
      })));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save your weekly availability.");
    } finally {
      setIsSaving(false);
    }
  }, [availability]);

  return { availability, isSaving, error, loadAvailability, toggleTime, saveAvailability };
}
