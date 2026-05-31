import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"

export async function proxy(request: NextRequest) {
  const session = await auth()
  console.log("MIDDLEWARE URL:", request.nextUrl.pathname, "SESSION:", session)

  // Public routes — no auth required (e.g. QR code warranty verification)
  const publicPaths = ['/warranty/check']
  if (publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next()
  }

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
    const path = request.nextUrl.pathname
    // Allow Cashiers to access internal consumption page
    const cashierAllowedInventoryPaths = ['/inventory/consumption']
    const isAllowedInventoryPath = cashierAllowedInventoryPaths.some(p => path.startsWith(p))

    if (
      !isAllowedInventoryPath && (
        path.startsWith('/admin') ||
        path.startsWith('/staff') ||
        path.startsWith('/agents') ||
        path.startsWith('/inventory')
      )
    ) {
      return NextResponse.redirect(new URL('/sales', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
