"use client";

import * as React from "react";

import { playNotificationSound } from "@/lib/notifications/sound";

/**
 * Watches the app-wide Sonner host and adds a soft local chime whenever a
 * new toast notification appears. It is intentionally DOM-observational so
 * existing toast call-sites keep working without a risky application-wide refactor.
 */
export function NotificationSoundController() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      let hasNewToast = false;

      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches("[data-sonner-toast]") || node.querySelector("[data-sonner-toast]")) {
            hasNewToast = true;
            break;
          }
        }
        if (hasNewToast) break;
      }

      if (hasNewToast) void playNotificationSound();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
