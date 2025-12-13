import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const users = db.collection('users');

        const user = await users.findOne({ email });

        // Security: Don't reveal if user exists, but don't error out.
        // Also, don't send if already verified.
        if (!user || user.emailVerified) {
            return NextResponse.json({ success: true, message: "If that account exists and is unverified, an email has been sent." });
        }

        // Generate NEW token
        const newToken = uuidv4();

        await users.updateOne(
            { _id: user._id },
            { $set: { verificationToken: newToken } }
        );

        await sendVerificationEmail(email, newToken);

        return NextResponse.json({ success: true, message: "Verification email resent." });

    } catch (e) {
        console.error("Resend error:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}