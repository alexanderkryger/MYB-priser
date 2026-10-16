// Vercel Routing Middleware – beskytter hele siden bag login.
// Brugernavn/kode kan overskrives med miljøvariablerne LOGIN_USER, LOGIN_PASSWORD og LOGIN_SECRET i Vercel.
const USER = process.env.LOGIN_USER || "brandvaerk";
const PASSWORD = process.env.LOGIN_PASSWORD || "brandvaerk8600";
const SECRET = process.env.LOGIN_SECRET || "myb-prisliste-2026";
const COOKIE = "myb_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dage

export const config = { matcher: "/:path*" };

async function token() {
  const data = new TextEncoder().encode(`${USER}:${PASSWORD}:${SECRET}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function redirect(url, location, cookie) {
  const headers = { Location: new URL(location, url).toString(), "Cache-Control": "no-store" };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(null, { status: 303, headers });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Login-siden og logoerne må vises uden login
  if (path === "/login.html" || path === "/login" || path.startsWith("/assets/")) return;

  if (path === "/auth" && request.method === "POST") {
    const form = await request.formData();
    const ok = form.get("username") === USER && form.get("password") === PASSWORD;
    if (!ok) return redirect(url, "/login.html?fejl=1");
    const cookie = `${COOKIE}=${await token()}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
    return redirect(url, "/", cookie);
  }

  if (path === "/logout") {
    return redirect(url, "/login.html", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  }

  if (getCookie(request, COOKIE) === (await token())) return;

  return redirect(url, "/login.html");
}
