// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();
        if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        
        // Find user with valid token
        const user = await db.collection('users').findOne({ 
            resetToken: token, 
            resetTokenExpiry: { $gt: new Date() } 
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update User
        await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpiry: "" }
            }
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}