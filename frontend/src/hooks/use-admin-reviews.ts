"use client";

import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

export type AdminReview = {
  id: string;
  rating: number;
  comment: string;
  displayName: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
  createdAt: string;
  booking: { id: string; service: { name: string } };
  customer: { firstName: string; lastName: string; email: string };
};

export function useAdminReviews() {
  const [adminKey, setAdminKey] = useState("");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  async function loadReviews(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const list = await apiRequest<AdminReview[]>("/admin/reviews", { headers: { "x-admin-key": adminKey } });
      setReviews(list);
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load reviews.");
    } finally {
      setIsLoading(false);
    }
  }

  async function setStatus(id: string, status: AdminReview["status"]) {
    setSavingId(id);
    setError("");
    try {
      await apiRequest(`/admin/reviews/${id}`, { method: "PATCH", headers: { "x-admin-key": adminKey }, body: JSON.stringify({ status }) });
      setReviews((current) => current.map((review) => review.id === id ? { ...review, status } : review));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't update this review.");
    } finally {
      setSavingId("");
    }
  }

  function signOut() {
    setAdminKey("");
    setReviews([]);
    setIsAuthorized(false);
  }

  return { adminKey, setAdminKey, reviews, isAuthorized, isLoading, savingId, error, loadReviews, setStatus, signOut };
}
