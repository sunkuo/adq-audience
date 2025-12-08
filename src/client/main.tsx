/**
 * React 应用入口
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import router from "./router";

const rootElement = document.getElementById("root")!;

const app = <StrictMode>{router}</StrictMode>;

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement));
  root.render(app);
} else {
  createRoot(rootElement).render(app);
}
