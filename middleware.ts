import { NextResponse, type NextRequest } from "next/server"

// =====================================================================
// MAINTENANCE WINDOW
// ---------------------------------------------------------------------
// Enable:  Set env var  MAINTENANCE_MODE=true  (Vercel: Project ->
//          Settings -> Environment Variables, then redeploy) OR add it
//          to your local .env file.
// Disable: Remove MAINTENANCE_MODE or set it to "false".
//
// While enabled, the middleware answers ALL requests directly with a
// static response. No app code runs (auth context, Supabase, WLD price,
// etc.) -> virtually no requests reach the backend anymore.
//
// Admin bypass: ?bypass=<MAINTENANCE_BYPASS_SECRET> sets a cookie and
// lets you through normally.
// =====================================================================

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true"
const BYPASS_SECRET = process.env.MAINTENANCE_BYPASS_SECRET || ""
const BYPASS_COOKIE = "maintenance_bypass"

function maintenanceHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Under Maintenance</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:#0f172a;color:#e2e8f0;text-align:center;padding:24px}
  .card{max-width:420px}
  h1{font-size:1.6rem;margin:0 0 12px}
  p{color:#94a3b8;line-height:1.5;margin:0 0 8px}
  .spin{width:44px;height:44px;margin:0 auto 24px;border:4px solid #1e293b;
        border-top-color:#38bdf8;border-radius:50%;animation:r 1s linear infinite}
  @keyframes r{to{transform:rotate(360deg)}}
</style>
</head>
<body>
  <div class="card">
    <div class="spin"></div>
    <h1>Under Maintenance</h1>
    <p>We're currently performing updates.</p>
    <p>The app will be back online later. Thanks for your patience.</p>
  </div>
</body>
</html>`
}

export function middleware(req: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next()

  const { pathname, searchParams } = req.nextUrl

  // Bypass per Query-Parameter setzt einen Cookie
  if (BYPASS_SECRET && searchParams.get("bypass") === BYPASS_SECRET) {
    const url = req.nextUrl.clone()
    url.searchParams.delete("bypass")
    const res = NextResponse.redirect(url)
    res.cookies.set(BYPASS_COOKIE, BYPASS_SECRET, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
    })
    return res
  }

  // Bereits freigeschaltete Admins normal durchlassen
  if (BYPASS_SECRET && req.cookies.get(BYPASS_COOKIE)?.value === BYPASS_SECRET) {
    return NextResponse.next()
  }

  // API-Requests bekommen 503 JSON
  if (pathname.startsWith("/api")) {
    return new NextResponse(
      JSON.stringify({ error: "maintenance", message: "Service temporarily unavailable." }),
      {
        status: 503,
        headers: {
          "content-type": "application/json",
          "retry-after": "120",
          "cache-control": "no-store",
        },
      },
    )
  }

  // Alle anderen Requests: statische Wartungsseite
  return new NextResponse(maintenanceHtml(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": "120",
      "cache-control": "no-store",
    },
  })
}

// Matcher: alles abfangen ausser Next-internen Assets, damit die
// Wartungsseite sauber (mit eigenem Styling) geladen werden kann.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$).*)",
  ],
}
