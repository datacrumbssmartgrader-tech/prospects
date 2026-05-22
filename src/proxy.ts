import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const verifiedSession = await decrypt(session);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/prospects');
  
  if (!verifiedSession && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (verifiedSession && isAuthPage) {
    return NextResponse.redirect(new URL('/prospects', request.url));
  }

  if (request.nextUrl.pathname === '/') {
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
