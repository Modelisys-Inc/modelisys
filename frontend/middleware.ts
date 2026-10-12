import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** Marketing site only — www → apex. No auth gate. */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""

  if (host.startsWith("www.")) {
    const rootDomain = host.replace("www.", "")
    const url = new URL(
      `https://${rootDomain}${request.nextUrl.pathname}${request.nextUrl.search}`,
    )
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|opengraph-image|icon|apple-icon|.*\\..*).*)",
  ],
}
