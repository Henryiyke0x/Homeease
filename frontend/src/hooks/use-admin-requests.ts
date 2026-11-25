"use client";

import { type FormEvent, useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { BookingRequest, RequestStatus } from "@/types/admin-request";

export function useAdminRequests() {
  const [adminKey, setAdminKey] = useState("");
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiRequest<BookingRequest[]>("/admin/booking-requests", { headers: { "x-admin-key": adminKey } });
      setRequests(result);
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load requests.");
    } finally {
      setIsLoading(false);
    }
  }, [adminKey]);

  const loadRequests = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchRequests();
  }, [fetchRequests]);

  const changeStatus = useCallback(async (id: string, status: RequestStatus) => {
    setSavingId(id);
    setError("");
    try {
      const updated = await apiRequest<BookingRequest>(`/admin/booking-requests/${id}`, { method: "PATCH", headers: { "x-admin-key": adminKey }, body: JSON.stringify({ status }) });
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this request.");
    } finally {
      setSavingId("");
    }
  }, [adminKey]);

  const confirmBooking = useCallback(async (id: string) => {
    setConfirmingId(id);
    setError("");
    try {
      const confirmed = await apiRequest<BookingRequest>(`/admin/booking-requests/${id}/confirm`, { method: "POST", headers: { "x-admin-key": adminKey } });
      setRequests((current) => current.map((request) => request.id === id ? confirmed : request));
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm this booking.");
    } finally {
      setConfirmingId("");
    }
  }, [adminKey]);

  const signOut = useCallback(() => {
    setAdminKey("");
    setRequests([]);
    setIsAuthorized(false);
    setError("");
  }, []);

  return { adminKey, setAdminKey, requests, isAuthorized, isLoading, savingId, confirmingId, error, setError, fetchRequests, loadRequests, changeStatus, confirmBooking, signOut };
}
