import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ allowed: false, error: "No ID" }, { status: 400 });

    const session = await getServerSession(authOptions);
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Fetch World Data
    const world = await db.collection('worlds').findOne({ worldId: storyId });
    if (!world) return NextResponse.json({ allowed: false }, { status: 404 });

    // 2. CHECK PRIVILEGED ACCESS FIRST (If Logged In)
    if (session?.user?.email) {
        const userId = (session.user as any).id;
        const userEmail = session.user.email.toLowerCase();

        // A. SysAdmin Check (God Mode)
        if (ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase()) {
            return NextResponse.json({ allowed: true, role: 'owner' });
        }

        // B. DB Role Check (Platform Admin)
        const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (userProfile?.roles?.includes('owner') || userProfile?.roles?.includes('admin')) {
            return NextResponse.json({ allowed: true, role: 'owner' });
        }

        // C. World Owner Check
        if (world.ownerId === userId) {
            return NextResponse.json({ allowed: true, role: 'owner' });
        }

        // D. Collaborator Check
        const collab = world.collaborators?.find((c: any) => c.userId === userId);
        if (collab) {
            return NextResponse.json({ allowed: true, role: collab.role });
        }
    }

    // 3. CHECK OPEN SOURCE
    // Only reachable if the user is NOT an owner/writer/admin
    // Open source worlds are accessible via hyperlink regardless of publication status.
    if (world.settings?.isOpenSource) {
        return NextResponse.json({ allowed: true, role: 'reader' });
    }

    // 4. Deny
    return NextResponse.json({ allowed: false, reason: "Unauthorized" }, { status: 403 });
}
``