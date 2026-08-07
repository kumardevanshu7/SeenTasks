import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

export default function InstallButton({ className = "button button-secondary" }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    if (isIos()) {
      setIosHint(true);
      return undefined;
    }

    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const clearPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", clearPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);

  if (isStandalone()) return null;

  if (installPrompt) {
    async function install() {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }
    return (
      <button type="button" className={className} onClick={install}>
        <Download size={16} /> Install app
      </button>
    );
  }

  if (iosHint) {
    return (
      <button
        type="button"
        className={className}
        title="Tap Share, then Add to Home Screen"
        onClick={() => {
          window.alert("On iPhone/iPad: tap the Share button, then “Add to Home Screen” to install SeenTasks.");
        }}
      >
        <Share size={16} /> Add to Home Screen
      </button>
    );
  }

  return null;
}
