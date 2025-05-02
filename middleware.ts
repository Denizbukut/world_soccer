import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === "/login"

  // Check if user is logged in (based on localStorage in the client, but we can't access that here)
  // Instead, we'll check for a specific cookie that would be set during login
  const isLoggedIn = request.cookies.has("animeworld_auth")

  // Redirect logic
  if (isPublicPath && isLoggedIn) {
    // If user is on a public path but is logged in, redirect to home
    return NextResponse.redirect(new URL("/", request.url))
  }

  // For all other cases, continue
  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/login"],
}
