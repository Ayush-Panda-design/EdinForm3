// Client-side auth utilities
// Token is stored in localStorage under TOKEN_KEY.
// The tRPC client reads it via getToken() and sends it as
// "Authorization: Bearer <token>" on every request.
//
// Security note: This exposes the token to JavaScript (XSS risk).
// The recommended upgrade path is to have the API set the token
// as an httpOnly cookie and use credentials:"include" on the fetch,
// removing the Authorization header entirely. That requires
// server-side Set-Cookie support which is tracked separately.

export const TOKEN_KEY = "formcraft_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
