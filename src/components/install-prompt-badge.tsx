import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowUpRight, Download, Plus, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "scripture-reader:install-badge-dismissed";

/** Standalone = running as an installed app (Android/Chrome display-mode, or iOS home-screen). */
function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports itself as a Mac with touch points.
  const isIpadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOs;
}

/**
 * Compact floating badge, styled after a small pill in the bottom corner:
 * - "Install Scripture" for visitors without the app, dismissed per session.
 * - "Open Scripture" once the app is installed (standalone mode, the
 *   `appinstalled` event, or Chrome's getInstalledRelatedApps check).
 */
export function InstallPromptBadge() {
  const router = useRouter();
  const [standalone, setStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [checked, setChecked] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Initial state check on every page load: standalone detection, session
  // dismissal, and a best-effort "is the PWA installed in this browser" probe.
  useEffect(() => {
    let cancelled = false;

    setStandalone(detectStandalone());
    setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");

    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<unknown>>;
    };
    const probe = nav.getInstalledRelatedApps
      ? nav.getInstalledRelatedApps().catch(() => [] as Array<unknown>)
      : Promise.resolve([] as Array<unknown>);

    // Don't hold the badge hostage to the probe; race it with a short timeout.
    const timeout = window.setTimeout(() => {
      if (!cancelled) setChecked(true);
    }, 1200);
    void probe.then((apps) => {
      if (cancelled) return;
      if (apps.length > 0) setStandalone(true);
      setChecked(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  // Listen for the native install prompt and for the app becoming installed.
  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const bip = event as BeforeInstallPromptEvent;
      // Only trust the event if it carries a real prompt() method.
      if (typeof bip.prompt !== "function") return;
      event.preventDefault();
      setDeferredPrompt(bip);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };
    const onDisplayModeChange = () => setStandalone(detectStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handlePrimaryClick = async () => {
    if (standalone) {
      // Already inside the app (or the browser knows the app is installed):
      // go to the home experience.
      if (detectStandalone()) {
        router.navigate({ to: "/" });
      } else {
        // Best-effort launch of the installed app via its start_url.
        window.location.assign("/");
      }
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") setStandalone(true);
      } catch {
        // The dialog was dismissed or unavailable; fall through to help.
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    // No native prompt available: iOS Safari (or another browser without
    // install-prompt support) gets the manual instructions instead.
    setShowHelpModal(true);
  };

  if (dismissed || !checked) return null;

  return (
    <>
      <div className="fixed bottom-[4.4rem] right-3 z-50 sm:bottom-4 sm:right-4">
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/95 py-1.5 pl-2 pr-3 shadow-soft backdrop-blur-md">
          <button
            type="button"
            onClick={handlePrimaryClick}
            className="flex items-center gap-2 rounded-full transition-colors hover:opacity-80"
            aria-label={standalone ? "Open Scripture" : "Install Scripture"}
          >
            <img src="/pwa-icon.svg" alt="" className="size-6 rounded-lg" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs font-medium text-foreground">
              {standalone ? "Open Scripture" : "Install Scripture"}
            </span>
            {standalone ? (
              <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Add Scripture to your home screen"
        >
          <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/pwa-icon.svg" alt="" className="size-10 rounded-xl" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Add Scripture to your home screen
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Keep the reader one tap away.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {detectIos() ? (
              <ol className="mt-5 space-y-3 text-sm text-foreground">
                <li className="flex items-center gap-3">
                  <Share className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  Tap the <span className="font-medium">Share</span> button in Safari
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  Scroll and choose <span className="font-medium">Add to Home Screen</span>
                </li>
              </ol>
            ) : (
              <p className="mt-5 text-sm text-foreground">
                Open your browser's menu and choose{" "}
                <span className="font-medium">Install app</span> or{" "}
                <span className="font-medium">Add to Home Screen</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
