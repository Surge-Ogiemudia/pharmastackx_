
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Helper function to verify the JWT
async function verifyToken(token: string) {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'changeme');
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string };
  } catch (e) {
    console.error('JWT Verification Error:', e);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  
  const url = request.nextUrl.clone();
  const userAgent = request.headers.get('user-agent') || '';
  const { pathname } = request.nextUrl;

  // Minimal Bot Protection: block known aggressive scrapers that bypass CDN caching
  const botList = [/bot/i, /scraper/i, /crawl/i, /spider/i];
  const isBot = botList.some(r => r.test(userAgent));
  if (isBot && pathname.startsWith('/api/') && pathname !== '/api/whatsapp/webhook') {
    console.warn(`[Middleware] Blocked suspected bot: ${userAgent}`);
    return new NextResponse('Access Denied', { status: 403 });
  }

  const hostname = request.headers.get('host') || '';
  // New Subdomain Logic
  const mainDomains = ['pharmastackx.com', 'psx.ng']; 
  const slug = hostname.split('.')[0];
  // Check if the request is on a subdomain (and not 'www').
  const isSubdomain = mainDomains.some(domain => hostname.endsWith(domain)) &&
                      !hostname.startsWith('www.') &&
                      !mainDomains.includes(hostname);


  if (isSubdomain && pathname === '/') {
    console.log(`[Middleware] Subdomain root hit. Redirecting to /find-medicines?slug=${slug}`);
    url.pathname = '/find-medicines';
    url.searchParams.set('slug', slug);
    return NextResponse.redirect(url);
  }
  
  
  const sessionToken = request.cookies.get('session_token')?.value;

  const protectedRoutes = ['/admin', '/business', '/delivery-agents', '/orders', '/carechat', '/store-management'];
  const isProtectedRoute = protectedRoutes.some(path => pathname.startsWith(path));

  if (isProtectedRoute) {
    const payload = await verifyToken(sessionToken || '');

    if (!payload) {
      const loginUrl = new URL('/auth', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session_token');
      return response;
    }

    // --- Role-based access control ---
    let effectiveRole = payload.role;
    if (effectiveRole === 'pharmacist') {
      effectiveRole = 'pharmacy';
    }

    console.log(`[Middleware] Protected Route: ${pathname}, User Role: ${payload.role}, Effective Role: ${effectiveRole}`);

    if (pathname.startsWith('/admin') && effectiveRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/business') || pathname.startsWith('/store-management')) {
      const allowedRoles = ['pharmacy', 'vendor', 'admin', 'stockManager'];
      if (!allowedRoles.includes(effectiveRole)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api routes (handled as function invocations, not edge)
     * - _next/static (Next.js static assets)
     * - _next/image (Next.js image optimization)
     * - favicon.ico
     * - All static file extensions (images, fonts, icons, manifests)
     * This prevents middleware from firing on every image/icon on the page,
     * which was the primary cause of high edge request counts.
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|eot|json|xml|txt|mp4|mp3|pdf|zip)$).*)',
  ],
};
