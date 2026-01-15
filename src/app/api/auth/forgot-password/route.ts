// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const token = uuidv4();
        const expiry = new Date(Date.now() + 3600000);
        const result = await db.collection('users').updateOne(
            { email: email },
            { $set: { resetToken: token, resetTokenExpiry: expiry } }
        );

        if (result.matchedCount > 0) {
            await sendPasswordResetEmail(email, token);
        }

        return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
    } catch (e) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}