import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { UserDocument } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;
        console.log(`[API: GET /admin/assets/mine] User ${userId} fetching their assets.`);

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        const user = await db.collection<UserDocument>('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { assets: 1 } }
        );

        if (!user || !user.assets) {
            return NextResponse.json({ assets: [] });
        }

        // Sort by newest first
        const sortedAssets = user.assets.sort((a: any, b: any) => {
            const dateA = new Date(a.uploadedAt || 0).getTime();
            const dateB = new Date(b.uploadedAt || 0).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({ assets: sortedAssets });

    } catch (error) {
        console.error('Asset fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}