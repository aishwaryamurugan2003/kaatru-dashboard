export function isTokenAlive(token: string | null): boolean {
  if (!token) return false;

  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return false;

    // Convert base64url → base64
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    if (!payload.exp) return false;

    const now = Math.floor(Date.now() / 1000);

    console.log("Token exp:", payload.exp);
    console.log("Now:", now);

    // Add 10-second tolerance
    return payload.exp > now - 10;
  } catch (err) {
    console.error("Token decode failed:", err);
    return false;
  }
}
