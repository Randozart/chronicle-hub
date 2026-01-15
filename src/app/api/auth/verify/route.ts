import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = body;

        console.log(`[Verify API] Attempting to verify token: ${token}`);

        if (!token) {
            console.log("[Verify API] Error: Missing token");
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const users = db.collection('users');
        const user = await users.findOne({ verificationToken: token });

        if (!user) {
            console.log(`[Verify API] Error: Token not found in DB.`);
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        console.log(`[Verify API] Success! Verifying user: ${user.email}`);
        await users.updateOne(
            { _id: user._id },
            { 
                $set: { emailVerified: new Date() },
                $unset: { verificationToken: "" } 
            }
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[Verify API] Server Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}