import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MoticosMerge from "./MoticosMerge.jsx";
import CollectionGarden from "./collection/CollectionGarden.jsx";
import "./styles.css";
import "./iphone.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has("classic") || new URLSearchParams(window.location.search).has("gallery") ? <MoticosMerge /> : <CollectionGarden />}
  </StrictMode>
);
