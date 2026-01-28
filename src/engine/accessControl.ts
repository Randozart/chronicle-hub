import clientPromise from '@/engine/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function verifyWorldAccess(
    worldId: string, 
    requiredPermission: 'reader' | 'writer' | 'owner' = 'writer'
): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    
    const userId = (session.user as any).id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. GLOBAL SYSTEM CHECK (God Mode for SysAdmin to help with debugging)
    const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (userProfile && userProfile.roles) {
        if (userProfile.roles.includes('owner') || userProfile.roles.includes('admin')) {
            return true; 
        }
    }

    // 2. FETCH WORLD
    const world = await db.collection('worlds').findOne({ worldId });
    if (!world) return false;

    // 3. WORLD OWNER CHECK
    if (world.ownerId === userId) {
        return true;
    }

    // 4. OPEN SOURCE CHECK
    // If the user only needs read access, check if the world is Open Source
    if (requiredPermission === 'reader') {
        const settings = world.settings || {};
        
        // Must be flagged Open Source
        if (settings.isOpenSource) {
            // Must be publicly visible (Published or In Progress)
            // We check the root 'published' flag which is true for both statuses in the DB
            // Or explicitly check the status string for clarity
            const status = settings.publicationStatus || (world.published ? 'published' : 'private');
            
            if (status === 'published' || status === 'in_progress') {
                return true;
            }
        }
    }

    // 5. COLLABORATOR CHECK
    if (requiredPermission === 'owner') {
        return false; 
    }

    const collaborators = world.collaborators || [];
    const userCollab = collaborators.find((c: any) => c.userId === userId);

    if (userCollab) {
        if (requiredPermission === 'writer' && userCollab.role === 'reader') {
            return false;
        }
        return true;
    }

    // 6. DENY
    return false;
}