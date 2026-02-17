import clientPromise from '@/engine/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function verifyWorldAccess(
    worldId: string, 
    requiredPermission: 'reader' | 'writer' | 'owner' = 'writer'
): Promise<boolean> {
    const session = await getServerSession(authOptions);
    
    // 1. HARDCODED GOD MODE
    if (session?.user?.email && ADMIN_EMAIL && session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return true; 
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne({ worldId });
    if (!world) return false;

    if (session?.user) {
        const userId = (session.user as any).id;

        // 2. DATABASE ADMIN ROLE CHECK
        const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (userProfile?.roles?.includes('owner') || userProfile?.roles?.includes('admin')) {
            return true; 
        }

        // 3. WORLD OWNER CHECK
        if (world.ownerId === userId) {
            return true;
        }

        // 4. COLLABORATOR CHECK
        const collaborators = world.collaborators || [];
        const userCollab = collaborators.find((c: any) => c.userId === userId);
        if (userCollab) {
            // If they are a collaborator, check if their role is sufficient.
            // A 'writer' can do 'reader' tasks. An 'owner' can do both.
            if (requiredPermission === 'reader') return true;
            if (requiredPermission === 'writer' && userCollab.role === 'writer') return true;
            // A collaborator can never satisfy an 'owner' requirement.
            return false;
        }
    }
    
    // 5. OPEN SOURCE READER CHECK
    // If we've reached this point and the user only needs reader access, check the open source flag.
    // Open source worlds are accessible via hyperlink regardless of publication status.
    if (requiredPermission === 'reader') {
        if (world.settings?.isOpenSource) {
            return true;
        }
    }

    // 6. DENY BY DEFAULT
    // If no other condition was met, access is denied.
    return false;
}