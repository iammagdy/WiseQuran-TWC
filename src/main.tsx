import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";


registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("New version available");
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  }
});

createRoot(document.getElementById("root")!).render(<App />);
