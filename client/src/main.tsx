import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import Home from "./routes/Home";
import Onboarding from "./routes/Onboarding";
import Search from "./routes/Search";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/welcome", element: <Onboarding /> },
  { path: "/search", element: <Search /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
