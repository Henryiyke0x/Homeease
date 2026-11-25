"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AccountForm, AccountUser, AddressForm, CustomerRequest, SavedAddress } from "@/types/account";

const emptyForm: AccountForm = { firstName: "", lastName: "", email: "", phone: "", password: "" };
const emptyAddress: AddressForm = { label: "", line1: "", city: "", state: "", instructions: "" };

export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
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
  const [error, setError] = useState("");

  const loadCustomerData = useCallback(async () => {
    const [customerRequests, savedAddresses] = await Promise.all([
      apiRequest<CustomerRequest[]>("/customer/booking-requests"),
      apiRequest<SavedAddress[]>("/customer/addresses"),
    ]);
    setRequests(customerRequests);
    setAddresses(savedAddresses);
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
      const updated = await apiRequest<CustomerRequest>(`/customer/booking-requests/${id}/cancel`, { method: "POST" });
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
      setConfirmCancelId("");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "We couldn't cancel this request.");
    } finally {
      setCancellingId("");
    }
  }, []);

  return {
    user, requests, addresses, addressForm, form, isRegistering, isCheckingSession,
    isSubmitting, isSavingAddress, removingAddressId, confirmCancelId, cancellingId,
    error, setError, setIsRegistering, setConfirmCancelId, update, updateAddress,
    submit, signOut, addAddress, removeAddress, cancelRequest,
  };
}
