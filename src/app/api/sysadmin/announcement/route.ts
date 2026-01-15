// src/app/api/sysadmin/announcement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, content, severity, enabled } = body;

    if (!id || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    await db.collection('platform_announcements').replaceOne(
        { _id: "current_message" as any },
        {
            _id: "current_message",
            real_id: id,
            title,
            content,
            severity,
            enabled,
            updatedAt: new Date()
        },
        { upsert: true }
    );

    return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    const msg = await db.collection('platform_announcements').findOne({ _id: "current_message" as any });

    return NextResponse.json(msg || { real_id: 'v1.0', title: '', content: '', severity: 'info', enabled: false });
}