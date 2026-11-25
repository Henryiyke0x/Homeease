"use client";

import { useEffect, useRef } from "react";

export function useSceneTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      element.style.setProperty("--scene-tilt-x", "0deg");
      element.style.setProperty("--scene-tilt-y", "0deg");
    };
    const onMove = (event: PointerEvent) => {
      if (reducedMotion.matches || event.pointerType === "touch") return;
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      element.style.setProperty("--scene-tilt-x", `${(-y * 5).toFixed(2)}deg`);
      element.style.setProperty("--scene-tilt-y", `${(x * 7).toFixed(2)}deg`);
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", reset);
    reducedMotion.addEventListener("change", reset);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, []);

  return ref;
}
