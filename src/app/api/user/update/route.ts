import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust path to your auth options
import clientPromise from '@/engine/database';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { preferredTheme } = body;

        // Validation
        if (!['light', 'dark', 'system'].includes(preferredTheme)) {
            return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("chronicle_hub"); // Adjust DB name if needed
        const users = db.collection("users");

        await users.updateOne(
            { email: session.user.email },
            { $set: { preferredTheme: preferredTheme } }
        );

        return NextResponse.json({ success: true, theme: preferredTheme });
    } catch (error) {
        console.error("Failed to update user preferences:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}