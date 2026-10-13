import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";

function CoreAppShell() {
  return (
    <main className="app-shell">
      <p className="eyebrow">ONE DIG · PUBLIC WORKS</p>
      <h1>OneDig</h1>
      <p className="intro">A shared, clear record of work happening on your streets.</p>
      <p className="status" role="status">Core service is starting.</p>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The app root element is missing.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <CoreAppShell />
  </React.StrictMode>,
);
