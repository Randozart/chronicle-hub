import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

// Cache revalidation time (e.g. 5 minutes)
export const revalidate = 300; 

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // Announcements might be public, but let's assume checking 'acknowledged' requires user context.
    // If public, we just return the message without checking acknowledgement.
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    // Fetch the active announcement
    const announcement = await db.collection('platform_announcements').findOne({ enabled: true });
    
    if (!announcement) return NextResponse.json(null);

    // If logged in, check if they dismissed it
    if (session?.user) {
        const userId = (session.user as any).id;
        const user = await db.collection('users').findOne({ _id: new Object(userId) }); // Note: Ensure ObjectId import if needed or use string ID if your auth setup does
        
        // Using string comparison for safety if IDs vary
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