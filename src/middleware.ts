// src/middleware.ts

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    // Get the session token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Get the pathname of the request (e.g., '/', '/profile')
    const { pathname } = req.nextUrl;

    // --- THIS IS THE CORE LOGIC ---
    // If the user is trying to access a protected route (like the homepage '/')
    // AND they do NOT have a token...
    if (pathname === '/' && !token) {
        // ...redirect them to the login page.
        // We construct an absolute URL to be safe.
        const loginUrl = new URL('/login', req.url);
        return NextResponse.redirect(loginUrl);
    }

    // If the user is on the login or register page AND they DO have a token...
    if ((pathname === '/login' || pathname === '/register') && token) {
        // ...redirect them to the homepage, because they are already logged in.
        const homeUrl = new URL('/', req.url);
        return NextResponse.redirect(homeUrl);
    }
    
    // If none of the above conditions are met, allow the request to proceed.
    return NextResponse.next();
}

// This config ensures the middleware runs on the specified paths.
export const config = {
    // We want the middleware to run on the root, login, and register pages
    // to handle both protecting the root and redirecting logged-in users.
    matcher: ['/', '/login', '/register'],
};