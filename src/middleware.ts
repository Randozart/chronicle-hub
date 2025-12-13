import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // 1. PUBLIC ROUTES
    if (
        pathname === '/' || 
        pathname.startsWith('/api/worlds') || 
        pathname.startsWith('/docs') || 
        pathname.startsWith('/api/register') || 
        pathname.startsWith('/api/auth') ||     
        pathname === '/login' || 
        pathname === '/register' ||
        pathname === '/verify-email' || // <--- ADD THIS LINE
        pathname.startsWith('/_next') || 
        pathname.startsWith('/images') || 
        pathname.startsWith('/themes') ||
        pathname === '/favicon.ico' ||
        pathname === '/logo-w.svg' ||
        pathname.startsWith('/playground/ligature')  


    ) {
        // If logged in, redirect OUT of login/register pages to Home
        if (token && (pathname === '/login' || pathname === '/register')) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
    }

    // 2. PROTECTED ROUTES (Create, Play, Character APIs)
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!static|favicon.ico).*)'],
};