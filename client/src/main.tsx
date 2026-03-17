import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates immediately and every 5 minutes
      reg.update();
      setInterval(() => reg.update(), 5 * 60 * 1000);
      // When a new SW takes over, reload to get fresh assets
      reg.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }).catch(() => {});
  });
}
