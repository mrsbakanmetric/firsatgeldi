"use client";

// Countdowns of the sign-in screens: "Tekrar gönder · 0:58", "Tekrar dene · 14:32".
// The end time comes from the server (`retryAfterSeconds`, `resendCooldownSeconds`).
import { useCallback, useSyncExternalStore } from "react";

const SECOND_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const PAD = 2;

const nowInSeconds = () => Math.floor(Date.now() / SECOND_MS);
/** Server render: no countdown runs before the page is interactive. */
const serverSeconds = () => 0;

/** Seconds left until `endsAt` (epoch ms), updated every second; 0 when over or null. */
export function useSecondsLeft(endsAt: number | null): number {
  // A one-second clock, only while a countdown runs.
  const subscribe = useCallback(
    (tick: () => void) => {
      if (endsAt === null) return () => undefined;
      const timer = setInterval(tick, SECOND_MS);
      return () => clearInterval(timer);
    },
    [endsAt],
  );
  const now = useSyncExternalStore(subscribe, nowInSeconds, serverSeconds);
  if (endsAt === null || now === 0) return 0;
  return Math.max(0, Math.floor(endsAt / SECOND_MS) - now);
}

/** 872 → "14:32", 58 → "0:58". */
export function clock(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return `${minutes}:${String(seconds % SECONDS_PER_MINUTE).padStart(PAD, "0")}`;
}
