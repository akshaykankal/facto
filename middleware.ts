import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard', '/preferences']
  const authPaths = ['/login', '/signup']
  const pathname = request.nextUrl.pathname

  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isAuthPath = authPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPath && token) {
    try {
      verifyToken(token)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch {
      // Invalid token, continue to auth page
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/preferences/:path*', '/login', '/signup']
}