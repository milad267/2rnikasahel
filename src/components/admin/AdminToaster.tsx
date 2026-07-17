"use client";

import { Toaster } from "sonner";

export default function AdminToaster() {
  return (
    <Toaster
      position="top-left"
      richColors
      closeButton
      dir="rtl"
      toastOptions={{
        style: { fontFamily: "inherit" },
      }}
    />
  );
}
