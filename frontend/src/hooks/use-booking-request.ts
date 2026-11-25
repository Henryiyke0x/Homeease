"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { BookingRequest, SavedAddress, Service } from "@/types/booking";

const initialRequest: BookingRequest = {
  service: "",
  details: "",
  date: "",
  time: "",
  address: "",
  addressId: "",
  contactName: "",
  phone: "",
};

export function useBookingRequest() {
  const [request, setRequest] = useState(initialRequest);
  const [services, setServices] = useState<Service[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [quotedBasePrice, setQuotedBasePrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    apiRequest<Service[]>("/services")
      .then(setServices)
      .catch((error) => setCatalogError(error instanceof Error ? error.message : "Services are temporarily unavailable."));
    apiRequest<{ user: { id: string } }>("/auth/me")
      .then(() => apiRequest<SavedAddress[]>("/customer/addresses"))
      .then(setSavedAddresses)
      .catch(() => undefined);
  }, []);

  const update = useCallback((field: keyof BookingRequest, value: string) => {
    setRequest((current) => ({ ...current, [field]: value }));
  }, []);

  const selectSavedAddress = useCallback((id: string) => {
    const selected = savedAddresses.find((address) => address.id === id);
    if (!selected) {
      setRequest((current) => ({ ...current, addressId: "", address: "" }));
      return;
    }
    const formattedAddress = [selected.line1, selected.city, selected.state, selected.country !== "Nigeria" ? selected.country : ""]
      .filter(Boolean)
      .join(", ");
    setRequest((current) => ({ ...current, addressId: selected.id, address: formattedAddress }));
  }, [savedAddresses]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const result = await apiRequest<{ id: string; quotedBasePrice: string }>("/booking-requests", {
        method: "POST",
        body: JSON.stringify(request.addressId ? request : { ...request, addressId: undefined }),
      });
      setRequestId(result.id);
      setQuotedBasePrice(result.quotedBasePrice);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We couldn't send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [request]);

  return {
    request,
    services,
    savedAddresses,
    submitted,
    requestId,
    quotedBasePrice,
    isSubmitting,
    submitError,
    catalogError,
    update,
    selectSavedAddress,
    handleSubmit,
    setSubmitted,
  };
}
