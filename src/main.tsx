import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./App";
import { SessionProvider } from "./session";
import { PrefsProvider } from "./prefs";
import { ToastProvider, ConfirmProvider, ErrorBoundary } from "./ui-feedback";
import "./index.css";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n: number, e: any) => e?.status === 0 && n < 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
          <PrefsProvider>
            <SessionProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <RouterProvider router={router} />
                </ConfirmProvider>
              </ToastProvider>
            </SessionProvider>
          </PrefsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
