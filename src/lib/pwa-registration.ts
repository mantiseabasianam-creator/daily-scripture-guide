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

  const oldRegistration = registrations.find((registration) =>
    [registration.active, registration.waiting, registration.installing].some((worker) => {
      if (!worker) return false;
      try {
        return new URL(worker.scriptURL).pathname === "/service-worker.js";
      } catch {
        return false;
      }
    }),
  );
  if (oldRegistration) {
    try {
      await oldRegistration.update();
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const current = await navigator.serviceWorker.getRegistrations();
        if (!current.some(isAppWorker)) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const current = await navigator.serviceWorker.getRegistrations();
      if (current.some(isAppWorker)) return;
    } catch (error) {
      console.error("The previous offline version could not be cleared yet.", error);
      return;
    }
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.error("Offline reading support could not be started.", error);
  }
}