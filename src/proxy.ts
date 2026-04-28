import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"

export async function proxy(request: NextRequest) {
  const session = await auth()
  console.log("MIDDLEWARE URL:", request.nextUrl.pathname, "SESSION:", session)

  // Protect all non-public routes
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    console.log("REDIRECTING TO LOGIN!")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect signed-in users away from login
  if (session && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // RBAC checks
  const role = session?.user?.role;

  if (role === 'CASHIER') {
    if (
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/staff') ||
      request.nextUrl.pathname.startsWith('/agents')
    ) {
      return NextResponse.redirect(new URL('/sales', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
