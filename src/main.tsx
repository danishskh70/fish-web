import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
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
        <BrowserRouter>
          <PrefsProvider>
            <SessionProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <App />
                </ConfirmProvider>
              </ToastProvider>
            </SessionProvider>
          </PrefsProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
