import clientPromise from '@/engine/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

/**
 * Verifies if the current session user has access to the specified world.
 * 
 * Access Levels:
 * 1. System Admin/Owner (Global 'owner' or 'admin' role in Users collection) -> ACCESS GRANTED
 * 2. World Owner (ownerId matches) -> ACCESS GRANTED
 * 3. Collaborator (userId in collaborators list) -> ACCESS GRANTED (if role matches required level)
 */
export async function verifyWorldAccess(
    worldId: string, 
    requiredPermission: 'reader' | 'writer' | 'owner' = 'writer'
): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    
    const userId = (session.user as any).id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. GLOBAL SYSTEM CHECK
    // We check the USERS collection to see if this person is a Platform Admin/Owner.
    // If so, they bypass all world-specific checks.
    const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (userProfile && userProfile.roles) {
        // 'owner' here refers to the System Owner, not the world owner.
        // 'admin' refers to trusted staff.
        if (userProfile.roles.includes('owner') || userProfile.roles.includes('admin')) {
            return true; 
        }
    }

    // 2. FETCH WORLD
    const world = await db.collection('worlds').findOne({ worldId });
    if (!world) return false; // World doesn't exist

    // 3. WORLD OWNER CHECK
    if (world.ownerId === userId) {
        return true;
    }

    // 4. COLLABORATOR CHECK
    // If the action requires 'owner' permission (like deleting the world),
    // normal collaborators are denied. Only the true owner or SysAdmin can do this.
    if (requiredPermission === 'owner') {
        return false; 
    }

    const collaborators = world.collaborators || [];
    const userCollab = collaborators.find((c: any) => c.userId === userId);

    if (userCollab) {
        // If the route requires 'writer' access, make sure they aren't just a 'reader'
        if (requiredPermission === 'writer' && userCollab.role === 'reader') {
            return false;
        }
        return true;
    }

    // 5. DENY ALL OTHERS
    return false;
}