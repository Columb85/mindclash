import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Maintenance stub — toggled via Vercel env only (do not hardcode in vercel.json `env`).
 *
 * Vercel: Project → Settings → Environment Variables
 *   Name:  MAINTENANCE_MODE
 *   Value: true | false  (also accepts 1 / yes; case-insensitive)
 * Scopes: Production and/or Preview as needed.
 *
 * After changing the value, run a new deployment (Redeploy). Edge middleware
 * reads this at build time; changing the var without redeploying does not update
 * the running bundle.
 */
export function middleware(request: NextRequest) {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  const maintenance = raw === 'true' || raw === '1' || raw === 'yes';

  // Already on /maintenance — let it through to avoid redirect loop
  if (request.nextUrl.pathname === '/maintenance') {
    // If maintenance is OFF and someone hits /maintenance directly → redirect home
    if (!maintenance) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  // Bypass API routes, static files, and Next.js internals
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rewrite to /maintenance for all page requests when flag is on
  if (maintenance) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
