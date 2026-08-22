import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Apple, ArrowLeft, BookOpen, Chrome, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  emailSchema,
  fieldErrors,
  passwordSchema,
  passwordStrength,
  signInSchema,
  signUpSchema,
} from "@/lib/auth";
import { CHURCH_TRADITIONS, getChurchName, NATIONS } from "@/lib/church-directory";


export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Scripture Reader" },
      { name: "description", content: "Sign in or create a Scripture Reader account." },
    ],
  }),
});

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

function AuthPage() {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "reset"
      ? "reset-password"
      : "sign-up",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [church, setChurch] = useState<string>(CHURCH_TRADITIONS[0]);
  const [nation, setNation] = useState<string>(NATIONS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = passwordStrength(password);

  const setAuthMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setError("");
    setErrors({});
    setPassword("");
    setConfirmPassword("");
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.redirected) return;
    window.location.assign("/profile");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setErrors({});

    const validation =
      mode === "sign-up"
        ? signUpSchema.safeParse({ firstName, lastName, email, password, confirmPassword })
        : mode === "sign-in"
          ? signInSchema.safeParse({ email, password })
          : mode === "forgot-password"
            ? emailSchema.safeParse(email)
            : passwordSchema.safeParse(password);

    if (!validation.success) {
      if (mode === "forgot-password") setErrors({ email: validation.error.issues[0]!.message });
      else if (mode === "reset-password")
        setErrors({ password: validation.error.issues[0]!.message });
      else setErrors(fieldErrors(validation.error));
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.assign("/profile");
        return;
      }

      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: {
              first_name: firstName,
              last_name: lastName,
              church,
              nation,
              church_name: getChurchName(nation, church),
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          data.session
            ? "Your account is ready. Redirecting to your library…"
            : "Check your email to confirm your account, then return to sign in.",
        );
        if (data.session) window.location.assign("/profile");
        return;
      }

      if (mode === "forgot-password") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (resetError) throw resetError;
        setMessage("If an account exists for that email, a password reset link is on its way.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now continue to your library.");
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  const copy = {
    "sign-in": {
      title: "Welcome back",
      description: "Sign in to keep your Scripture library with you.",
      action: "Sign in",
    },
    "sign-up": {
      title: "Create your account",
      description: "Save your notes, highlights, and bookmarks across devices.",
      action: "Create account",
    },
    "forgot-password": {
      title: "Reset your password",
      description: "Enter your email and we’ll send a secure reset link.",
      action: "Send reset link",
    },
    "reset-password": {
      title: "Choose a new password",
      description: "Use a password you have not used before.",
      action: "Update password",
    },
  }[mode];
  const needsPassword = mode !== "forgot-password";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Scripture Reader
        </Link>
        <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="grid size-11 place-items-center rounded-2xl gradient-dawn text-primary-foreground">
            <BookOpen className="size-5" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p>

          {mode !== "forgot-password" && mode !== "reset-password" && (
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" onClick={() => void handleOAuth("google")}>
                <Chrome /> Continue with Google
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleOAuth("apple")}>
                <Apple /> Continue with Apple
              </Button>
              <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                or continue with email
              </div>
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            {mode !== "reset-password" && (
              <label className="grid gap-1.5 text-sm font-medium">
                Email address
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                    placeholder="you@example.com"
                  />
                </span>
              </label>
            )}

            {mode === "sign-up" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    First name
                    <Input
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="First name"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Last name
                    <Input
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Last name"
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm font-medium">
                  Your church tradition
                  <select
                    value={church}
                    onChange={(event) => setChurch(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CHURCH_TRADITIONS.map((churchOption) => (
                      <option key={churchOption}>{churchOption}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Nation for church events
                  <select
                    value={nation}
                    onChange={(event) => setNation(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {NATIONS.map((nationOption) => (
                      <option key={nationOption}>{nationOption}</option>
                    ))}
                  </select>
                </label>
                <p className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
                  Your events will be matched with{" "}
                  <span className="font-semibold">{getChurchName(nation, church)}</span>.
                </p>
              </>
            )}
            {needsPassword && (
              <label className="grid gap-1.5 text-sm font-medium">
                {mode === "reset-password" ? "New password" : "Password"}
                <span className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9 pr-10"
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(errors['password'])}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
                {mode !== "sign-in" && password.length > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="flex h-1.5 flex-1 gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-full flex-1 rounded-full ${
                            i < strength.score ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {strength.label}
                    </span>
                  </span>
                )}
                {errors['password'] && (
                  <span className="text-xs font-normal text-destructive">{errors['password']}</span>
                )}
              </label>
            )}
            {mode === "sign-up" && (
              <label className="grid gap-1.5 text-sm font-medium">
                Confirm password
                <span className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="pl-9"
                    placeholder="Re-enter your password"
                    aria-invalid={Boolean(errors['confirmPassword'])}
                  />
                </span>
                {errors['confirmPassword'] && (
                  <span className="text-xs font-normal text-destructive">
                    {errors['confirmPassword']}
                  </span>
                )}
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : copy.action}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "sign-in" && (
              <>
                <button
                  type="button"
                  className="hover:text-foreground hover:underline"
                  onClick={() => setAuthMode("forgot-password")}
                >
                  Forgot password?
                </button>
                <span className="mx-2">·</span>New here?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setAuthMode("sign-up")}
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "sign-up" && (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setAuthMode("sign-in")}
                >
                  Sign in
                </button>
              </>
            )}
            {(mode === "forgot-password" || mode === "reset-password") && (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setAuthMode("sign-in")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
