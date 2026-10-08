const APP_WORKER_PATHS = new Set(["/sw.js", "/service-worker.js"]);

function isAppWorker(registration: ServiceWorkerRegistration) {
  const scripts = [registration.active, registration.waiting, registration.installing];
  return scripts.some((worker) => {
    if (!worker) return false;
    try {
      const script = new URL(worker.scriptURL);
      return script.origin === window.location.origin && APP_WORKER_PATHS.has(script.pathname);
    } catch {
      return false;
    }
  });
}

export async function registerOfflineWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inFrame = false;
  try {
    inFrame = window.self !== window.top;
  } catch {
    inFrame = true;
  }
  const host = window.location.hostname;
  const unsupportedHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  const refused =
    !import.meta.env.PROD ||
    inFrame ||
    unsupportedHost ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
  if (refused) {
    await Promise.allSettled(
      registrations.filter(isAppWorker).map((registration) => registration.unregister()),
    );
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.error("Offline reading support could not be started.", error);
  }
}