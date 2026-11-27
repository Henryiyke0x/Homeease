"use client";

import { type FormEvent, useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Booking, Professional } from "@/types/admin-booking";

export function useAdminBookings() {
  const [adminKey, setAdminKey] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [professionalsByBooking, setProfessionalsByBooking] = useState<Record<string, Professional[]>>({});
  const [selectedProfessional, setSelectedProfessional] = useState<Record<string, string>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const headers = { headers: { "x-admin-key": adminKey } };
      const bookingList = await apiRequest<Booking[]>("/admin/bookings", headers);
      const professionalEntries = await Promise.all(bookingList.map(async (booking) => {
        if (!["CONFIRMED", "ASSIGNED"].includes(booking.status)) return [booking.id, []] as const;
        const professionals = await apiRequest<Professional[]>(`/admin/available-professionals?bookingId=${encodeURIComponent(booking.id)}`, headers);
        return [booking.id, professionals] as const;
      }));
      setBookings(bookingList);
      setProfessionalsByBooking(Object.fromEntries(professionalEntries));
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

  const refund = useCallback(async (bookingId: string) => {
    const amount = refundAmounts[bookingId]?.trim();
    const detail = amount ? `NGN ${amount}` : "the remaining refundable balance";
    if (!window.confirm(`Request a Paystack refund of ${detail} for this booking? This will send a real refund request.`)) return;
    setWorkingId(bookingId);
    setError("");
    try {
      await apiRequest(`/admin/bookings/${bookingId}/refunds`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(amount ? { amount } : {}),
      });
      setRefundAmounts((current) => ({ ...current, [bookingId]: "" }));
      await loadData();
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "Unable to initiate this refund.");
    } finally {
      setWorkingId("");
    }
  }, [adminKey, loadData, refundAmounts]);

  const signOut = useCallback(() => {
    setAdminKey("");
    setBookings([]);
    setProfessionalsByBooking({});
    setIsAuthorized(false);
  }, []);

  const selectProfessional = useCallback((bookingId: string, professionalId: string) => {
    setSelectedProfessional((current) => ({ ...current, [bookingId]: professionalId }));
  }, []);

  const setRefundAmount = useCallback((bookingId: string, amount: string) => {
    setRefundAmounts((current) => ({ ...current, [bookingId]: amount }));
  }, []);

  return { adminKey, setAdminKey, bookings, professionalsByBooking, selectedProfessional, refundAmounts, isAuthorized, isLoading, workingId, error, loadData, signIn, assign, cancel, refund, signOut, selectProfessional, setRefundAmount };
}
