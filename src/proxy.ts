import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;
    if (
        pathname === '/' || 
        pathname.startsWith('/api/worlds') || 
        pathname.startsWith('/docs') || 
        pathname.startsWith('/api/register') || 
        pathname.startsWith('/api/auth') ||     
        pathname === '/login' || 
        pathname === '/register' ||
        pathname === '/verify-email' || 
        pathname === '/forgot-password' || 
        pathname === '/reset-password' ||  
        pathname.startsWith('/_next') || 
        pathname.startsWith('/images') || 
        pathname.startsWith('/themes') ||
        pathname === '/favicon.ico' ||
        pathname === '/logo-w.svg' ||
        pathname === '/logo.svg' ||

        pathname.startsWith('/playground/ligature')  ||
        pathname.startsWith('/sounds') 

    ) {
        if (token && (
            pathname === '/login' || 
            pathname === '/register' || 
            pathname === '/forgot-password' || 
            pathname === '/reset-password'
        )) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
    }
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!static|favicon.ico).*)'],
};