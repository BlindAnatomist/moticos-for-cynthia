import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import MatchingCollection from "./matching/MatchingCollection.jsx";
import "./styles.css";
import "./iphone.css";

// Historic modes remain independently reachable without making the new garden
// download all of their art-generation and UI code on its first visit.
const MoticosMerge = lazy(() => import("./MoticosMerge.jsx"));
const CollectionGarden = lazy(() => import("./collection/CollectionGarden.jsx"));
const params = new URLSearchParams(window.location.search);
const app = params.has("classic") || params.has("gallery")
  ? <MoticosMerge />
  : params.has("recipe-study") ? <CollectionGarden /> : <MatchingCollection />;

createRoot(document.getElementById("root")).render(
  <StrictMode><Suspense fallback={<p role="status" style={{ padding: 24 }}>Opening Moticos…</p>}>{app}</Suspense></StrictMode>
);
