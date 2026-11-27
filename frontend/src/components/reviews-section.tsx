"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type PublicReview = { id: string; rating: number; comment: string; displayName: string; createdAt: string; booking: { service: { name: string } } };

export function ReviewsSection() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  useEffect(() => {
    apiRequest<PublicReview[]>("/reviews").then(setReviews).catch(() => setReviews([]));
  }, []);
  if (!reviews.length) return null;
  return <section className="px-6 py-20 sm:py-28" aria-labelledby="reviews-title">
    <div className="mx-auto max-w-7xl">
      <p className="section-kicker">Kind words from our customers</p>
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 id="reviews-title" className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-emerald-950 sm:text-5xl">Care that feels good,<br />from people who know.</h2><p className="mt-3 max-w-xl leading-7 text-stone-600">Reviews come from completed HomeEase bookings and are published after moderation.</p></div><span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">Latest {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><p className="text-lg tracking-widest text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span className="text-stone-200">{"★".repeat(5 - review.rating)}</span></p><blockquote className="mt-4 text-sm leading-7 text-stone-700">“{review.comment}”</blockquote><footer className="mt-6 border-t border-stone-100 pt-4"><p className="font-semibold text-emerald-950">{review.displayName}</p><p className="mt-1 text-xs text-stone-500">{review.booking.service.name}</p></footer></article>)}</div>
    </div>
  </section>;
}
