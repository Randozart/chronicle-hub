import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
export const revalidate = 300; 

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    const announcement = await db.collection('platform_announcements').findOne({ enabled: true });
    
    if (!announcement) return NextResponse.json(null);
    if (session?.user) {
        const userId = (session.user as any).id;
        const user = await db.collection('users').findOne({ _id: new Object(userId) });
        const ackList = user?.acknowledgedPlatformMessages || [];
        if (ackList.includes(announcement._id.toString())) {
            return NextResponse.json(null);
        }
    }

    return NextResponse.json({
        id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        severity: announcement.severity || 'info'
    });
}