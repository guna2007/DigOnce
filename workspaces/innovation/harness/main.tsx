import React from "react";
import { createRoot } from "react-dom/client";
import { marketRoadSnapshot } from "../fixtures/marketRoad.js";

function Harness() {
  return <main style={{ fontFamily: "system-ui", maxWidth: 880, margin: "2rem auto", padding: "0 1rem" }}>
    <p><strong>Illustrative demo data</strong> · Synthetic fixture, not a municipal schedule.</p>
    <h1>Dig Once Studio fixture harness</h1>
    <p>Fixture loaded for {marketRoadSnapshot.segments[0]?.roadName}; focus project {marketRoadSnapshot.focusProjectId}.</p>
    <p>The standalone engine and review components will render here as their tasks are implemented.</p>
  </main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><Harness /></React.StrictMode>);
