import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadRuntimeData } from "./data/runtimeData";

if (!window.location.hash) {
  window.location.hash = "#/";
}

loadRuntimeData().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
