import { NextResponse, type NextRequest } from "next/server"

// =====================================================================
// SHUTDOWN SCREEN
// ---------------------------------------------------------------------
// Enable:  Set env var  MAINTENANCE_MODE=true  (Vercel: Project ->
//          Settings -> Environment Variables, then redeploy) OR add it
//          to your local .env file.
// Disable: Remove MAINTENANCE_MODE or set it to "false".
//
// While enabled, the middleware answers ALL requests directly with a
// static "game shut down" response. No app code runs (auth context,
// Supabase, WLD price, etc.) -> virtually no requests reach the backend.
//
// Admin bypass: ?bypass=<MAINTENANCE_BYPASS_SECRET> sets a cookie and
// lets you through normally.
// =====================================================================

// The shutdown screen is ON by default. To bring the app back online,
// set the env var MAINTENANCE_MODE=false (Vercel: Settings -> Environment
// Variables -> Production) and redeploy.
const MAINTENANCE = process.env.MAINTENANCE_MODE !== "false"
const BYPASS_SECRET = process.env.MAINTENANCE_BYPASS_SECRET || ""
const BYPASS_COOKIE = "maintenance_bypass"

function maintenanceHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Game Shut Down</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:#0f172a;color:#e2e8f0;text-align:center;padding:24px}
  .card{max-width:420px}
  h1{font-size:1.6rem;margin:0 0 12px}
  p{color:#94a3b8;line-height:1.5;margin:0 0 8px}
</style>
</head>
<body>
  <div class="card">
    <h1>Game Shut Down</h1>
    <p>This game has been shut down and is no longer available.</p>
    <p>Thank you to everyone who played.</p>
  </div>
</body>
</html>`
}

export function middleware(req: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next()

  const { pathname, searchParams } = req.nextUrl

  // Bypass via query parameter sets a cookie
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

  // Let already-unlocked admins through normally
  if (BYPASS_SECRET && req.cookies.get(BYPASS_COOKIE)?.value === BYPASS_SECRET) {
    return NextResponse.next()
  }

  // API requests get a 503 JSON response
  if (pathname.startsWith("/api")) {
    return new NextResponse(
      JSON.stringify({ error: "shutdown", message: "This game has been shut down." }),
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

  // All other requests: static shutdown page
  return new NextResponse(maintenanceHtml(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": "120",
      "cache-control": "no-store",
    },
  })
}

// Matcher: intercept everything except Next-internal assets, so the
// shutdown page can be loaded cleanly (with its own styling).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)$).*)",
  ],
}
