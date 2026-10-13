import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/tokens.css";
import "leaflet/dist/leaflet.css";
import "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The app root element is missing.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
