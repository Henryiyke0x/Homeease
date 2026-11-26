"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type PublicService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string;
};

export function usePublicServices() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<PublicService[]>("/services")
      .then(setServices)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Services are temporarily unavailable."))
      .finally(() => setIsLoading(false));
  }, []);

  return { services, isLoading, error };
}
