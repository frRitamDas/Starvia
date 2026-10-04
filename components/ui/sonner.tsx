"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast host. Styled with CSS variables so it follows the theme.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border/80 bg-card text-card-foreground shadow-lg text-sm",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-destructive/40",
          success: "border-success/40",
        },
      }}
      closeButton
    />
  );
}
