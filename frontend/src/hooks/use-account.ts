"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AccountForm, AccountNotification, AccountUser, AddressForm, CustomerRequest, CustomerReview, SavedAddress } from "@/types/account";
import type { AppointmentTime } from "@/types/booking";

const emptyForm: AccountForm = { firstName: "", lastName: "", email: "", phone: "", password: "" };
const emptyAddress: AddressForm = { label: "", line1: "", city: "", state: "", instructions: "" };

export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [form, setForm] = useState(emptyForm);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [removingAddressId, setRemovingAddressId] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [reschedulingId, setReschedulingId] = useState("");
  const [payingId, setPayingId] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");

  const loadCustomerData = useCallback(async () => {
    const [customerRequests, savedAddresses, customerNotifications] = await Promise.all([
      apiRequest<CustomerRequest[]>("/customer/booking-requests"),
      apiRequest<SavedAddress[]>("/customer/addresses"),
      apiRequest<AccountNotification[]>("/notifications"),
    ]);
    setRequests(customerRequests);
    setAddresses(savedAddresses);
    setNotifications(customerNotifications);
  }, []);

  useEffect(() => {
    apiRequest<{ user: AccountUser }>("/auth/me")
      .then(async ({ user: currentUser }) => {
        if (currentUser.role === "PROFESSIONAL") {
          window.location.replace("/professional/jobs");
          return;
        }
        setUser(currentUser);
        await loadCustomerData();
      })
      .catch(() => undefined)
      .finally(() => setIsCheckingSession(false));
  }, [loadCustomerData]);

  const update = useCallback((field: keyof AccountForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const updateAddress = useCallback((field: keyof AddressForm, value: string) => {
    setAddressForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering ? form : { email: form.email, password: form.password };
      const result = await apiRequest<{ user: AccountUser }>(endpoint, { method: "POST", body: JSON.stringify(payload) });
      if (result.user.role === "PROFESSIONAL") {
        window.location.assign("/professional/jobs");
        return;
      }
      setUser(result.user);
      await loadCustomerData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't complete that request.");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isRegistering, loadCustomerData]);

  const signOut = useCallback(async () => {
    setError("");
    try {
      await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
      setUser(null);
      setRequests([]);
      setAddresses([]);
      setNotifications([]);
      setForm(emptyForm);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "We couldn't sign you out.");
    }
  }, []);

  const addAddress = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAddress(true);
    setError("");
    try {
      const address = await apiRequest<SavedAddress>("/customer/addresses", { method: "POST", body: JSON.stringify(addressForm) });
      setAddresses((current) => [address, ...current]);
      setAddressForm(emptyAddress);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save this address.");
    } finally {
      setIsSavingAddress(false);
    }
  }, [addressForm]);

  const removeAddress = useCallback(async (id: string) => {
    setRemovingAddressId(id);
    setError("");
    try {
      await apiRequest<{ ok: boolean }>(`/customer/addresses/${id}`, { method: "DELETE" });
      setAddresses((current) => current.filter((address) => address.id !== id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "We couldn't remove this address.");
    } finally {
      setRemovingAddressId("");
    }
  }, []);

  const cancelRequest = useCallback(async (id: string) => {
    setCancellingId(id);
    setError("");
    try {
      const request = requests.find((item) => item.id === id);
      if (!request) throw new Error("We couldn't find that request. Refresh and try again.");
      if (request.booking && ["CONFIRMED", "ASSIGNED"].includes(request.booking.status)) {
        const booking = await apiRequest<{ id: string; status: "CANCELLED" }>(`/customer/bookings/${request.booking.id}/cancel`, { method: "POST" });
        setRequests((current) => current.map((item) => item.id === id ? { ...item, booking: item.booking ? { ...item.booking, status: booking.status } : null } : item));
      } else {
        const updated = await apiRequest<CustomerRequest>(`/customer/booking-requests/${id}/cancel`, { method: "POST" });
        setRequests((current) => current.map((item) => item.id === id ? updated : item));
      }
      setConfirmCancelId("");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "We couldn't cancel this request.");
    } finally {
      setCancellingId("");
    }
  }, [requests]);

  const rescheduleBooking = useCallback(async (bookingId: string, date: string, time: AppointmentTime) => {
    setReschedulingId(bookingId);
    setError("");
    try {
      const updated = await apiRequest<{ id: string; status: "CONFIRMED" | "ASSIGNED"; scheduledAt: string }>(`/customer/bookings/${bookingId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ date, time }),
      });
      setRequests((current) => current.map((request) => request.booking?.id === bookingId
        ? { ...request, booking: { ...request.booking, scheduledAt: updated.scheduledAt, status: updated.status } }
        : request));
      return true;
    } catch (rescheduleError) {
      setError(rescheduleError instanceof Error ? rescheduleError.message : "We couldn't reschedule this booking.");
      return false;
    } finally {
      setReschedulingId("");
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      const updated = await apiRequest<AccountNotification>(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((notification) => notification.id === id ? updated : notification));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "We couldn't update this notification.");
    }
  }, []);

  const startPayment = useCallback(async (bookingId: string) => {
    setPayingId(bookingId);
    setError("");
    try {
      const result = await apiRequest<{ authorizationUrl: string | null; alreadyPaid: boolean }>(`/customer/bookings/${bookingId}/payment/initialize`, { method: "POST" });
      if (result.alreadyPaid) {
        setRequests((current) => current.map((request) => request.booking?.id === bookingId
          ? { ...request, booking: { ...request.booking, payments: [{ status: "SUCCESS" }] } }
          : request));
      } else if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
      } else {
        throw new Error("Checkout is temporarily unavailable. Please try again.");
      }
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "We couldn't start checkout.");
      setPayingId("");
    }
  }, []);

  const submitReview = useCallback(async (bookingId: string, rating: number, comment: string, displayName: string) => {
    setReviewingId(bookingId);
    setError("");
    try {
      const review = await apiRequest<CustomerReview>(`/customer/bookings/${bookingId}/reviews`, {
        method: "POST", body: JSON.stringify({ rating, comment, displayName }),
      });
      setRequests((current) => current.map((request) => request.booking?.id === bookingId
        ? { ...request, booking: { ...request.booking, review } }
        : request));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "We couldn't submit your review.");
    } finally {
      setReviewingId("");
    }
  }, []);

  return {
    user, requests, notifications, addresses, addressForm, form, isRegistering, isCheckingSession,
    isSubmitting, isSavingAddress, removingAddressId, confirmCancelId, cancellingId, reschedulingId, payingId, reviewingId,
    error, setError, setIsRegistering, setConfirmCancelId, update, updateAddress,
    submit, signOut, addAddress, removeAddress, cancelRequest, rescheduleBooking, startPayment, submitReview, markNotificationRead,
  };
}
