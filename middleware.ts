import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Nur Login-Page abfangen
  const isPublicPath = path === "/login"

  // Prüfen, ob Cookies gesetzt sind
  const isLoggedIn = request.cookies.has("animeworld_auth")
  const isHumanVerified = request.cookies.get("human_verified")?.value === "true"

  if (isPublicPath && isLoggedIn && isHumanVerified) {
    // Wenn eingeloggt und verifiziert, Login-Page blockieren
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login"],
}
