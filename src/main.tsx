import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tasks are local-only — no stale time needed by default
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 24 }}
        toastOptions={{
          duration: 3500,
          style: {
            background: "#3B4252",
            color: "#ECEFF4",
            border: "1px solid #434C5E",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontFamily: '"Space Grotesk", sans-serif',
            padding: "10px 16px",
            boxShadow: "0 8px 24px rgba(46,52,64,0.6)",
          },
          success: { iconTheme: { primary: "#A3BE8C", secondary: "#3B4252" } },
          error: { iconTheme: { primary: "#BF616A", secondary: "#3B4252" } },
        }}
      />
      {(import.meta as unknown as { env: { DEV: boolean } }).env.DEV && <ReactQueryDevtools buttonPosition="bottom-right" />}
    </QueryClientProvider>
  </StrictMode>
);
