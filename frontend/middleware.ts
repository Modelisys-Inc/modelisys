import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isPublicPath } from "@/lib/public-paths"

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""

  // Redirect www to root domain
  if (host.startsWith("www.")) {
    const rootDomain = host.replace("www.", "")
    const url = new URL(`https://${rootDomain}${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url, 301)
  }

  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get("has_session")?.value === "1"

  // Redirect unauthenticated users to login
  if (!hasSession && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login to portal
  if (hasSession && pathname === "/login") {
    const portalUrl = new URL("/mon-portail", request.url)
    return NextResponse.redirect(portalUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except API routes, Next.js internals, and any file
    // with an extension (robots.txt, sitemap.xml, /images/*.svg, etc.).
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)",
  ],
}
