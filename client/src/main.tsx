import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import "./index.css";
import { Toaster } from "./components/Toaster";
import Home from "./routes/Home";
import Onboarding, { ONBOARDED_KEY } from "./routes/Onboarding";
import Search from "./routes/Search";

// First visit goes to onboarding (AC-10). Blocked storage counts as onboarded so the app stays usable.
const onboarded = () => {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true;
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

const router = createBrowserRouter([
  { path: "/", element: <Home />, loader: () => (onboarded() ? null : redirect("/welcome")) },
  { path: "/welcome", element: <Onboarding /> },
  { path: "/search", element: <Search /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
