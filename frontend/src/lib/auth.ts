const TOKEN_COOKIE = "if_token";
const ROLE_COOKIE = "if_role";
const NAME_COOKIE = "if_name";
const EMAIL_COOKIE = "if_email";
const PHONE_COOKIE = "if_phone";

export function setAuthCookies(token: string, role: string, name?: string, email?: string, phone?: string) {
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; samesite=lax`;

  if (typeof name === "string") {
    document.cookie = `${NAME_COOKIE}=${encodeURIComponent(name)}; path=/; max-age=${maxAge}; samesite=lax`;
  }
  if (typeof email === "string") {
    document.cookie = `${EMAIL_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${maxAge}; samesite=lax`;
  }
  if (typeof phone === "string") {
    document.cookie = `${PHONE_COOKIE}=${encodeURIComponent(phone)}; path=/; max-age=${maxAge}; samesite=lax`;
  }
}

export function clearAuthCookies() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${NAME_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${EMAIL_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${PHONE_COOKIE}=; path=/; max-age=0`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken(): string | null {
  return getCookie(TOKEN_COOKIE);
}

export function getRole(): string | null {
  return getCookie(ROLE_COOKIE);
}

export function getName(): string | null {
  return getCookie(NAME_COOKIE);
}

export function getEmail(): string | null {
  return getCookie(EMAIL_COOKIE);
}

export function getPhone(): string | null {
  return getCookie(PHONE_COOKIE);
}
