import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { username: 1, email: 1, image: 1, storageUsage: 1, storageLimit: 1 } }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        const body = await request.json();
        const { username, image, password, dob } = body;
        const updateDoc: any = {};

        if (username && username.trim().length > 0) updateDoc.username = username.trim();
        if (image !== undefined) updateDoc.image = image;
        if (dob !== undefined) updateDoc.dob = dob ? new Date(dob) : null;

        if (password && password.trim().length > 0) {
            if (password.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 });
            const hashedPassword = await bcrypt.hash(password, 10);
            updateDoc.password = hashedPassword;
        }

        if (Object.keys(updateDoc).length === 0) {
            return NextResponse.json({ success: true, message: 'No changes detected' });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateDoc }
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Profile update error:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}