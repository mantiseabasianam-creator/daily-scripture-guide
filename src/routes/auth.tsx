import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Apple, ArrowLeft, BookOpen, Chrome, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { authClient } from "@/lib/authClient";
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

type Mode = "sign-in" | "sign-up" | "verify-email" | "forgot-password" | "reset-password";

/** Error carrying a user-safe message that can be displayed verbatim. */
class FriendlyAuthError extends Error {}

const NETWORK_PATTERN =
  /failed to fetch|networkerror|fetch failed|load failed|network request failed/i;

/** Maps any auth failure to a friendly message; raw error text is never shown. */
function friendlyAuthError(error: unknown): string {
  if (error instanceof FriendlyAuthError) return error.message;
  const raw = error instanceof Error ? error.message : "";
  if (NETWORK_PATTERN.test(raw))
    return "We couldn't reach the sign-in service. Check your internet connection and try again.";
  if (/invalid login credentials/i.test(raw))
    return "That email and password don't match an account. Please double-check them and try again.";
  if (/already registered|already exists|user already/i.test(raw))
    return "That email is already registered. Try signing in instead, or reset your password if you've forgotten it.";
  if (/at least \d+ characters|weak password|password should|known to be weak|weak_password/i.test(raw))
    return "Your password needs at least 8 characters, with upper and lowercase letters and a number.";
  if (/rate limit|too many/i.test(raw))
    return "Too many attempts. Please wait a moment and try again.";
  if (/token has expired or is invalid|otp_failed/i.test(raw))
    return "That code is incorrect. Please try again.";
  if (/otp_expired|code expired/i.test(raw))
    return "This code has expired. Tap Resend code to get a new one.";
  if (/otp_disabled/i.test(raw))
    return "Email verification isn't available right now. Please try again later.";
  if (/confirm/i.test(raw))
    return "Please verify your email first. Use the resend option below, then sign in.";
  return "Something went wrong. Please try again.";
}

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
  const [showResend, setShowResend] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const strength = passwordStrength(password);

  // 60-second resend countdown on the "Verify your email" screen.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Focus the first code box when the verification screen appears.
  useEffect(() => {
    if (mode === "verify-email") otpRefs.current[0]?.focus();
  }, [mode]);

  const setAuthMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setError("");
    setErrors({});
    setShowResend(false);
    setPassword("");
    setConfirmPassword("");
    setOtp(["", "", "", "", "", ""]);
    setResendIn(0);
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    const { error: oauthError } = await authClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (oauthError) {
      setError("We couldn't start the sign-in. Please try again.");
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    const { error: resendError } = await authClient.auth.resend({ type: "signup", email });
    if (resendError) {
      setError(friendlyAuthError(resendError));
      return;
    }
    setMessage("Verification email sent. Please check your inbox (and spam folder).");
  };

  /** Confirms the 6-digit code in-app; runs automatically once all boxes fill. */
  const handleVerify = async (code: string) => {
    if (isSubmitting) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const { error: verifyError } = await authClient.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (verifyError) throw verifyError;
      setMessage("Email verified. Taking you to your library…");
      window.location.assign(`${window.location.origin}/profile`);
    } catch (verifyError) {
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setError(friendlyAuthError(verifyError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    const { error: resendError } = await authClient.auth.resend({ type: "signup", email });
    if (resendError) {
      setError(friendlyAuthError(resendError));
      return;
    }
    setResendIn(60);
    setMessage("A new code is on its way. Please check your inbox (and spam folder).");
  };

  const handleOtpChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setOtp((boxes) => boxes.map((digit, i) => (i === index ? "" : digit)));
      return;
    }
    const next = [...otp];
    let cursor = index;
    for (const digit of digits) {
      if (cursor > 5) break;
      next[cursor] = digit;
      cursor += 1;
    }
    setOtp(next);
    if (next.every(Boolean)) {
      void handleVerify(next.join(""));
    } else {
      otpRefs.current[Math.min(cursor, 5)]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace") return;
    if (otp[index]) {
      setOtp((boxes) => boxes.map((digit, i) => (i === index ? "" : digit)));
    } else if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtp((boxes) => boxes.map((digit, i) => (i === index - 1 ? "" : digit)));
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    setOtp(["", "", "", "", "", ""].map((_, i) => digits[i] ?? ""));
    if (digits.length === 6) {
      void handleVerify(digits);
    } else {
      otpRefs.current[digits.length]?.focus();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setErrors({});
    setShowResend(false);

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
        const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.assign(`${window.location.origin}/profile`);
        return;
      }

      if (mode === "sign-up") {
        const { data, error: signUpError } = await authClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: {
              display_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              church,
              nation,
              church_name: getChurchName(nation, church),
            },
          },
        });
        if (signUpError) throw signUpError;

        // A returned user with an empty identities array means the email is
        // already registered.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new FriendlyAuthError(
            "That email is already registered. Try signing in instead, or reset your password if you've forgotten it.",
          );
        }

        if (data.session) {
          setMessage("Your account is ready. Taking you to your library…");
          window.location.assign(`${window.location.origin}/profile`);
        } else {
          // Email confirmation is on: verify with the 6-digit code in-app.
          setAuthMode("verify-email");
          setResendIn(60);
        }
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
      const raw = authError instanceof Error ? authError.message : "";
      if (/confirm/i.test(raw)) setShowResend(true);
      setError(friendlyAuthError(authError));
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
    "verify-email": {
      title: "Verify your email",
      description: "Enter the 6-digit code we emailed you to finish creating your account.",
      action: "Verify",
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

          {mode === "verify-email" && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleVerify(otp.join(""));
              }}
            >
              <p className="text-sm text-foreground">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>
              </p>
              <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    value={digit}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={index === 0 ? 6 : 1}
                    aria-label={`Digit ${index + 1}`}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    onFocus={(event) => event.target.select()}
                    className="h-12 w-full max-w-12 px-0 text-center font-display text-xl"
                  />
                ))}
              </div>
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
                {isSubmitting ? "Please wait…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendIn > 0}
                onClick={() => void handleResendOtp()}
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setAuthMode("sign-up")}
                >
                  Wrong email? Go back
                </button>
              </div>
            </form>
          )}

          {mode !== "verify-email" && mode !== "forgot-password" && mode !== "reset-password" && (
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

          {mode !== "verify-email" && (
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
                    aria-invalid={Boolean(errors['email'])}
                  />
                </span>
                {errors['email'] && (
                  <span className="text-xs font-normal text-destructive">{errors['email']}</span>
                )}
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
                      aria-invalid={Boolean(errors['firstName'])}
                    />
                    {errors['firstName'] && (
                      <span className="text-xs font-normal text-destructive">
                        {errors['firstName']}
                      </span>
                    )}
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Last name
                    <Input
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Last name"
                      aria-invalid={Boolean(errors['lastName'])}
                    />
                    {errors['lastName'] && (
                      <span className="text-xs font-normal text-destructive">
                        {errors['lastName']}
                      </span>
                    )}
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
            {showResend && (
              <button
                type="button"
                onClick={() => void handleResend()}
                className="w-full text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Resend verification email
              </button>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : copy.action}
            </Button>
          </form>
          )}

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
