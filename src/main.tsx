import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <>
      <App />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "14px",
            background: "#ffffff",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          },
        }}
      />
    </>
  </StrictMode>,
);
