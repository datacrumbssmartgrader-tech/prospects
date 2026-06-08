import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const verifiedSession = await decrypt(session);

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login');
  const isDashboardPage = pathname.startsWith('/prospects') || pathname.startsWith('/admin') || pathname.startsWith('/account');

  if (!verifiedSession && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (verifiedSession && isAuthPage) {
    return NextResponse.redirect(new URL('/prospects', request.url));
  }

  // Admin-only guard
  if (
    verifiedSession &&
    pathname.startsWith('/admin') &&
    (verifiedSession as any).role !== "admin"
  ) {
    return NextResponse.redirect(new URL('/prospects', request.url));
  }

  if (pathname === '/') {
    if (verifiedSession) {
      return NextResponse.redirect(new URL('/prospects', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
