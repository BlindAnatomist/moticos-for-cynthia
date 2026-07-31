import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MoticosMerge from "./MoticosMerge.jsx";
import "./styles.css";
import "./iphone.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MoticosMerge />
  </StrictMode>
);
