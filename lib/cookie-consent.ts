"use client";

import { useSyncExternalStore } from "react";

export type CookieConsent = "granted" | "denied";

const STORAGE_KEY = "toymak-cookie-consent";

// Storage can be blocked (private mode, strict settings). The choice then
// lasts for this page load only and the banner asks again on the next one.
let unsavedChoice: CookieConsent | null = null;
let settingsOpen = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCookieConsent(): CookieConsent | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "granted" || saved === "denied") return saved;
  } catch {
    // See unsavedChoice.
  }
  return unsavedChoice;
}

export function setCookieConsent(choice: CookieConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    unsavedChoice = choice;
  }
  settingsOpen = false;
  notify();
}

/** Reopens the banner so a visitor can change their mind at any time. */
export function openCookieSettings() {
  settingsOpen = true;
  notify();
}

export function useCookieConsent(): CookieConsent | null {
  return useSyncExternalStore(subscribe, getCookieConsent, () => null);
}

export function useCookieBannerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => settingsOpen || getCookieConsent() === null,
    () => false,
  );
}
