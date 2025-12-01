import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // 1. PUBLIC ROUTES
    // Allow Home, API for fetching worlds, and Auth pages
    if (
        pathname === '/' || 
        pathname.startsWith('/api/worlds') || 
        pathname === '/login' || 
        pathname === '/register' ||
        pathname.startsWith('/_next') || // Static files
        pathname.startsWith('/images') || 
        pathname.startsWith('/themes')
    ) {
        // If user is logged in and tries to go to login/register, send to home
        if (token && (pathname === '/login' || pathname === '/register')) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
    }

    // 2. PROTECTED ROUTES
    // Block everything else (Play, Create, API calls for gameplay)
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        // Optional: Add ?callbackUrl=... to redirect back after login
        return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
}

// Matcher configuration
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes)
         * - static (static files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|static|favicon.ico).*)',
    ],
};