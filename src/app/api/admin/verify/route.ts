import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ allowed: false }, { status: 400 });

    const session = await getServerSession(authOptions);
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Fetch World Data first
    const world = await db.collection('worlds').findOne({ worldId: storyId });
    if (!world) return NextResponse.json({ allowed: false }, { status: 404 });

    // 2. Check Open Source Access
    if (world.settings?.isOpenSource && world.published) {
        return NextResponse.json({ allowed: true, role: 'reader' });
    }

    // Auth required for everything else
    if (!session?.user?.email) {
        return NextResponse.json({ allowed: false, reason: "Login required for this world" }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email.toLowerCase();

    // 3. SysAdmin Check
    if (ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase()) {
        return NextResponse.json({ allowed: true, role: 'owner' });
    }

    // 4. DB Role Check
    const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (userProfile?.roles?.includes('owner') || userProfile?.roles?.includes('admin')) {
        return NextResponse.json({ allowed: true, role: 'owner' });
    }

    // 5. Ownership / Collaboration
    if (world.ownerId === userId) return NextResponse.json({ allowed: true, role: 'owner' });

    const collab = world.collaborators?.find((c: any) => c.userId === userId);
    if (collab) {
        return NextResponse.json({ allowed: true, role: collab.role });
    }

    return NextResponse.json({ allowed: false }, { status: 403 });
}