import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function InstallButton({ className = "button button-secondary" }) {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
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

  if (!installPrompt) return null;

  async function install() {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return <button className={className} onClick={install}><Download size={16} /> Install app</button>;
}
