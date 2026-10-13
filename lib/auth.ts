export const MIN_PASSWORD_LENGTH = 12;

// Keep auth redirects on known app destinations, including extension linking.
export function authDestination(value: string | null | undefined): string {
  if (value === "/" || value === "/agents" || value === "/reset-password")
    return value;
  if (typeof value === "string" && value.startsWith("/connect?")) {
    const id = new URL(value, "https://tabd.invalid").searchParams.get(
      "extension",
    );
    if (id && /^[a-p]{32}$/.test(id)) return `/connect?extension=${id}`;
  }
  return "/";
}

export function passwordProblem(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words work well.`;
  if (password.length > 128)
    return "Use a password with 128 characters or fewer.";
  if (password !== confirmation)
    return "Your passwords don’t match. Enter the same password in both fields.";
  return null;
}

export function authError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error ? error.code : "";
  switch (code) {
    case "current_password_invalid":
    case "current_password_missing":
    case "current_password_mismatch":
      return "Your current password is incorrect. Try again or request a reset email.";
    case "invalid_credentials":
      return "The email or password is incorrect. Try again or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email before signing in. You can request a new confirmation email below.";
    case "user_already_exists":
    case "email_exists":
      return "If you already have an account, sign in or reset your password.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "weak_password":
      return "Choose a longer, unique password that you haven’t used elsewhere.";
    case "same_password":
      return "Choose a different password from your current one.";
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "For your security, sign in again or request a password reset email.";
    case "otp_expired":
    case "otp_disabled":
      return "This link has expired or was already used. Request a new email and use the latest link.";
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Your session has expired. Sign in again or request a new reset link.";
    default:
      return "We couldn’t complete that request. Check your connection and try again.";
  }
}

export const authNotices: Record<string, string> = {
  "link-expired":
    "This link has expired or was already used. Request a new email and use the latest link.",
  "callback-failed":
    "We couldn’t finish signing you in. Try again, or request a new confirmation email.",
  "password-updated":
    "Your password has been updated. Sign in with your new password.",
  "signed-out": "You’ve signed out of this browser.",
  "signed-out-all": "You’ve signed out of all browser sessions.",
  "session-expired": "Sign in again to continue.",
};
