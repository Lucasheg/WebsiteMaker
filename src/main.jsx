import React from "react";
import { createRoot } from "react-dom/client";
import Maker from "./Maker.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Maker />
  </React.StrictMode>
);
