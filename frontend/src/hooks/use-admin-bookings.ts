"use client";

import { type FormEvent, useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Booking, Professional } from "@/types/admin-booking";

export function useAdminBookings() {
  const [adminKey, setAdminKey] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Record<string, string>>({});
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const headers = { headers: { "x-admin-key": adminKey } };
      const [bookingList, professionalList] = await Promise.all([
        apiRequest<Booking[]>("/admin/bookings", headers),
        apiRequest<Professional[]>("/admin/available-professionals", headers),
      ]);
      setBookings(bookingList);
      setProfessionals(professionalList);
      setSelectedProfessional(Object.fromEntries(bookingList.map((booking) => [booking.id, booking.assignment?.professional.id ?? ""])));
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [adminKey]);

  const signIn = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadData();
  }, [loadData]);

  const assign = useCallback(async (bookingId: string) => {
    const professionalId = selectedProfessional[bookingId];
    if (!professionalId) return;
    setWorkingId(bookingId);
    setError("");
    try {
      const assignment = await apiRequest<Booking["assignment"]>(`/admin/bookings/${bookingId}/assign`, {
        method: "POST", headers: { "x-admin-key": adminKey }, body: JSON.stringify({ professionalId }),
      });
      setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, status: "ASSIGNED", assignment } : booking));
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign this booking.");
    } finally {
      setWorkingId("");
    }
  }, [adminKey, selectedProfessional]);

  const cancel = useCallback(async (bookingId: string) => {
    setWorkingId(bookingId);
    setError("");
    try {
      const updated = await apiRequest<Booking>(`/admin/bookings/${bookingId}/cancel`, { method: "POST", headers: { "x-admin-key": adminKey } });
      setBookings((current) => current.map((booking) => booking.id === bookingId ? updated : booking));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this booking.");
    } finally {
      setWorkingId("");
    }
  }, [adminKey]);

  const signOut = useCallback(() => {
    setAdminKey("");
    setBookings([]);
    setProfessionals([]);
    setIsAuthorized(false);
  }, []);

  const selectProfessional = useCallback((bookingId: string, professionalId: string) => {
    setSelectedProfessional((current) => ({ ...current, [bookingId]: professionalId }));
  }, []);

  return { adminKey, setAdminKey, bookings, professionals, selectedProfessional, isAuthorized, isLoading, workingId, error, loadData, signIn, assign, cancel, signOut, selectProfessional };
}
